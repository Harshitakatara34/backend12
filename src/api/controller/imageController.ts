import { imageModel } from "../model/imageModel";
import { Request, Response } from "express";
import { linkModal } from "../model/linkModel";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// history of generated image function
export const UsersPrivateImages = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const images = await imageModel
      .find({ userId, isPublic: false })

    res.status(200).json({ data: images });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all public images Function
export const GalleryImagesPublic = async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? req.query.search.toString() : "";
    const sortField = req.query.sortField ? req.query.sortField.toString() : "likesLength"; // Default sort by likes
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1; // Default sort order descending
    // Parse limit and page from query parameters, providing default values if not specified
    const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page
    const page = parseInt(req.query.page as string) || 1; // Default to first page

    let aggregationPipeline:any[] = [
      {
        $match: {
          isPublic: true,
          ...(search && {
            $or: [
              { description: { $regex: new RegExp(search), $options: "i" } },
              { tags: { $regex: new RegExp(search), $options: "i" } },
            ],
          }),
        },
      },
      // Add likesLength field conditionally, if sorting by likes
      ...(sortField === "likesLength" ? [{
        $addFields: {
          likesLength: { $size: "$likes" },
        },
      }] : []),
      {
        $sort: {
          ...(sortField === "likesLength" ? { likesLength: sortOrder } : { [sortField]: sortOrder }),
        },
      },
      // Pagination: skip and limit stages
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const images = await imageModel.aggregate(aggregationPipeline).exec();
    res.status(200).json({ data: images });
  } catch (error) {
    console.error("Error fetching public images:", error);
    res.status(500).json({ message: error.message });
  }
};

// get public image for Specifiic user Function
export const UserPublicImages = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    // Query for the images with pagination
    const images = await imageModel
      .find({ userId, isPublic: true })


    res.status(200).json({ data: images});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get single image Viwe & upadte viewCount Function
export const SingleImage = async (req: Request, res: Response) => {
  try {
    const imageId = req.params.imageId;

    const Image = await imageModel
      .findOneAndUpdate({ _id: imageId }, { $inc: { views: 1 } }, { new: true })
      .populate("userId");

    const link = await linkModal.findOne({ userId: (Image.userId as any)._id });

    const tags =  await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "assistant", content: "act as a tag generator , u will recive a image generation prompt and you have to responce with an array of suggested tags here is a prompt just responce with array of tags only. don't add any other sentence in your responce"},
        {role: "user", content: (Image.description as string)},
      ],
    });

    let suggestedTagsString = tags.choices[0].message.content;
    // Remove the leading and trailing double quotes and brackets
    suggestedTagsString = suggestedTagsString.trim().replace(/^\["|"\]$/g, '');
    // Split the string into an array and trim each tag to remove extra spaces and quotes
    let suggestedTags = suggestedTagsString.split(/",\s*"/).map(tag => tag.replace(/^"|"$/g, '')).slice(0, 5);
    

    res
      .status(201)
      .json({ message: "Views updated successfully", Image, link, suggestedTags });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// like image Function
export const LikeImage = async (req: Request, res: Response) => {
  const { userId, imageId } = req.body; 

  try {
    // Find the image by ID
    const image = await imageModel.findById(imageId).exec();
    
    if (image) {
      const index = image.likes.indexOf(userId);
      if (index === -1) {
        // If the user hasn't liked the image yet, add the user ID to the likes array
        image.likes.push(userId);
      } else {
        // If the user has already liked the image, remove the user ID from the likes array
        image.likes.splice(index, 1);
      }

      // Save the updated image document
      await image.save();

      // Send a response back to the client
      res.status(200).json({
        message: 'Successfully toggled like on image',
        image
      });
    } else {
      res.status(404).send('Image not found');
    }
  } catch (error) {
    res.status(500).send('Server error');
    console.error('LikeImage error:', error);
  }
};

// this route is for adding tags to an image and Post the image
export const AddTagAndPostImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;
  const { tags } = req.body; // Get the tags from the request body

  try {
    // Find the image by ID and update it by adding new tags and setting isPublic to true
    // $addToSet ensures that the tags are unique and won't be added if they already exist
    const updatedImage = await imageModel.findByIdAndUpdate(
      imageId,
      {
        $addToSet: { tags: { $each: tags } },
        $set: { isPublic: true }, // Set isPublic to true
      },
      { new: true } // Returns the updated document
    );

    if (!updatedImage) {
      return res.status(404).send({ message: "Image not found." });
    }

    res.status(200).send(updatedImage);
  } catch (error) {
    console.error("Failed to add tags to image and update isPublic:", error);
    res.status(500).send({
      message: "Failed to add tags to the image and update isPublic.",
    });
  }
};

// This route is for Geting All the images which is like by the Specific user
export const UserLikedImage = async (req: Request, res: Response) => {
  const { userId } = req.params; 

  try {
    // Find all images where the likes array contains the userId and apply pagination
    const images = await imageModel.find({
      likes: userId
    })
    
    // Send the found images and pagination information as a response
    res.status(200).json({
      data: images,
    });

  } catch (error) {
    console.error('Error fetching liked images:', error);
    res.status(500).send('Server error occurred while fetching liked images.');
  }
};

// unpublish Image
export const ImageUnpublish = async (req: Request, res: Response) => {
  const { imageId } = req.params;

  try {
    const updatedImage = await imageModel.findByIdAndUpdate(
      imageId,
      { $set: { isPublic: false } }, // Set isPublic to false
      { new: true }
    );

    // If no image was found with the given ID, return a 404 error
    if (!updatedImage) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Return the updated image document
    res
      .status(200)
      .json({ message: "Image unpublished successfully", image: updatedImage });
  } catch (error) {
    // Handle any errors that occur during the database operation
    console.error("Error unpublishing image:", error);
    res.status(500).json({ message: "Failed to unpublish image" });
  }
};


// act as a tag generator , u will recive a image generation prompt and you have to responce with an array of suggested tags here is a prompt just responce with array of tags only. don't add any other sentence in your responce