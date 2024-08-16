// global import
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

//local import

import cloudinary from "../../cloudinary/config";
import { imageModel } from "../model/imageModel";
import {
  AddTagAndPostImage,
  GalleryImagesPublic,
  ImageUnpublish,
  LikeImage,
  SingleImage,
  UserLikedImage,
  UserPublicImages,
  UsersPrivateImages,
} from "../controller/imageController";

dotenv.config();
const imageRouter = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//  generate image Route
imageRouter.post("/generateImage", async (req: Request, res: Response) => {
  try {
    const { description, userId, resolution } = req.body;

    let imageResolution: "1024x1024" | "1792x1024" | "1024x1792";

    if (resolution === "square" || resolution === "") {
      imageResolution = '1024x1024';
    } else if (resolution === "wide") {
      imageResolution = '1792x1024';
    } else {
      imageResolution = '1024x1792';
    }


    if (!description || !userId) {
      return res
        .status(400)
        .json({ message: "Prompt can't be empty or user Id required" });
    }

    // here we generate image using openai api
    const response = await openai.images.generate({
      model: "dall-e-3",
      response_format: "b64_json",
      prompt: description,
      quality: "hd",
      n: 1,
      size: imageResolution,
    });

    // here we save the generated image to the database
    const image_url = response.data[0].b64_json;

    const imageBuffer = Buffer.from(image_url, "base64");

    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "image",
          folder: "inspire-ai", // Optional: specify a folder in Cloudinary
        },
        async (error, result) => {
          if (error) {
            console.error(error);
          } else {
            // console.log("upload result : ", result);
            const newImage = new imageModel({
              description,
              userId,
              imageUrl: result.secure_url,
              likes: [],
            });

            await newImage.save();

            res
              .status(201)
              .json({ message: "Image created successfully", newImage });
          }
        }
      )
      .end(imageBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ai Prompt Generate Assisted
imageRouter.post("/assist", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(404).json({ message: "Prompt can't be empty" });
    }
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "assistant", content: "Given the user input below, generate a thoughtful Prompt that expands on the ideas presented and user will generate image using that prompt so make the prompt crisp."},
        {role: "user", content: text},
      ],
    });

    // console.log(completion.choices[0].message.content);

    res.status(200).json({ message: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// history of generated image Route
imageRouter.get("/history/:userId", UsersPrivateImages);

// Get all public images Route
imageRouter.get("/public", GalleryImagesPublic);

// get public image for Specifiic user Route
imageRouter.get("/userpublic/:userId", UserPublicImages);

// get single image Viwe & upadte viewCount Route
imageRouter.get("/public/:imageId", SingleImage);

// like image Route
imageRouter.post("/like", LikeImage);

// this route is for adding tags to an image and Post the image
imageRouter.patch("/public/:imageId/post", AddTagAndPostImage);

// This route is for Geting All the images which is like by the Specific user
imageRouter.get("/like/:userId", UserLikedImage);

// unpublish image Route
imageRouter.patch("/unpublish/:imageId", ImageUnpublish);

export default imageRouter;
