import express, { Response } from "express";
import jwt from "jsonwebtoken";
import Web3 from "web3";
import { generateUsername } from "unique-username-generator";
import { SiweMessage, generateNonce } from "siwe";

// local imports
import { userModel } from "../model/userModel";
import { authenticateToken } from "../middleware/authMiddleware";
import { CustomRequest } from "../../custom";
import { linkModal } from "../model/linkModel";
import { upload } from "../utils/multereConfig";
import cloudinary from "../../cloudinary/config";
import e from "express";

const userRouter = express.Router();
const web3 = new Web3("https://cloudflare-eth.com/");

// let nonce = "";
// let address = "";

userRouter.get("/nonce", async (req, res) => {
  const nonce = generateNonce();
  res.cookie("nonce", nonce, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ data: { nonce } });
});

userRouter.get("/me", authenticateToken, async (req: CustomRequest, res) => {
  const accesstoken = req.cookies.accesstoken;
  // console.log("accesstoken: ", accesstoken);

  const address = req.authData.address;

  // console.log("userAddress-userroute: ", address);

  res.json({ data: { address } });
});

userRouter.post("/verify", async (req, res) => {
  try {
    const { message, signature } = req.body;
    let accesstoken = "";
    let address = "";
    const siweMessage = new SiweMessage(message);
    const { success, data, error } = await siweMessage.verify({ signature });
    // console.log("error: ", error);
    // console.log("data: ", data);
    if (success) {
      address = data.address;
      accesstoken = jwt.sign({ address }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      // console.log("address - in verify: ", address);
      // console.log("accesstoken: ", accesstoken);
    }
    res.cookie("accesstoken", accesstoken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    const existingUser = await userModel.findOne({
      userAddress: address,
    });

    const link = await linkModal.findOne({ userId: existingUser?._id });

    if (existingUser) {
      return res.status(201).json({
        message: "User Login successfully",
        user: existingUser,
        link,
        accesstoken,
        ok: success,
      });
    } else {
      const user = new userModel({
        userAddress: address,
        userName: `@${generateUsername("", 2, 19)}`,
      });
      await user.save();
      return res.status(201).json({
        message: "Account created successfully",
        user,
        accesstoken,
        ok: success,
      });
    }

    // res.json({ accesstoken , ok : success });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

userRouter.post("/signout", (req, res) => {
  res.clearCookie("accesstoken", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.clearCookie("nonce", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ message: "User signed out successfully" });
});

// ---------------------------------------------------------------
// userRouter.get("/nonce", (req, res) => {
//   const nonce = new Date().getTime();
//   const address = req.query.address;
//   const jwtSecret = process.env.JWT_SECRET;

//   const tempToken = jwt.sign({ nonce, address }, jwtSecret, {
//     expiresIn: "60s",
//   });
//   const message = getSignMessage(address, nonce);

//   res.json({ tempToken, message });
// });

// userRouter.post("/verify", async (req: Request, res: Response) => {
//   const authHeader = req.headers["authorization"];
//   const tempToken = authHeader && authHeader.split(" ")[1];
//   const jwtSecret = process.env.JWT_SECRET;

//   if (tempToken === null) return res.sendStatus(403);

//   const userData = (await jwt.verify(tempToken, jwtSecret)) as {
//     nonce: number;
//     address: string;
//   };
//   const nonce = userData.nonce;
//   const address = userData.address;
//   const message = getSignMessage(address, nonce);
//   const signature = req.body.signature; // send the signature in the body

//   const verifiedAddress = await web3.eth.accounts.recover(message, signature);

//   if (verifiedAddress.toLowerCase() == address.toLowerCase()) {
//     const token = jwt.sign({ verifiedAddress }, jwtSecret, { expiresIn: "1d" });
//     res.json({ token });
//   } else {
//     res.sendStatus(403);
//   }
// });

// userRouter.get(
//   "/secret",
//   authenticateToken,
//   async (req: CustomRequest, res: Response) => {
//     if (!req.authData) {
//       return res.sendStatus(401); // Just a safeguard, should technically never hit this
//     }
//     // res.send(`Welcome address ${req.authData.verifiedAddress}`);
//     try {
//       const existingUser = await userModel.findOne({
//         userAddress: req.authData.verifiedAddress,
//       });
//       if (existingUser) {
//         return res
//           .status(201)
//           .json({ message: "User already exists", existingUser });
//       } else {
//         const user = new userModel({
//           userAddress: req.authData.verifiedAddress,
//           userName: `@${generateUsername("", 2, 19)}`,
//         });
//         await user.save();
//         return res
//           .status(201)
//           .json({ message: "User created successfully", user });
//       }
//     } catch (error) {
//       res.status(500).json({ message: "Internal server error" });
//     }
//   }
// );

// Add link to user profile Route
userRouter.post("/addlink/:userId", async (req, res) => {
  const { twitter, instagram, discord, youtube } = req.body;
  const { userId } = req.params;

  try {
    // First, try to find the document for the specific user
    let linkDocument = await linkModal.findOne({ userId });

    if (linkDocument) {
      // If the document exists, update it
      linkDocument.twitter = twitter || linkDocument.twitter;
      linkDocument.instagram = instagram || linkDocument.instagram;
      linkDocument.discord = discord || linkDocument.discord;
      linkDocument.youtube = youtube || linkDocument.youtube;

      await linkDocument.save();
    } else {
      // If the document does not exist, create a new one
      linkDocument = new linkModal({
        userId,
        twitter,
        instagram,
        discord,
        youtube,
      });

      await linkDocument.save();
    }

    res.status(201).json({
      message: "Link information processed successfully",
      link: linkDocument,
    });
  } catch (error) {
    console.error("Error processing link information:", error);
    res.status(500).json({ error: "Failed to process link information" });
  }
});

// Edit user profile Route
userRouter.patch(
  "/:userId",
  upload,
  async (req: CustomRequest, res: Response) => {
    const { userId } = req.params;
    const { userName, bio, wesite, email } = req.body;

    try {
      let imageUrl = null;
      let coverImageUrl = null;

      // Handle the profile image upload to Cloudinary
      if (req.files["profileImage"]) {
        const result = await cloudinary.uploader.upload(
          req.files["profileImage"][0].path,
          { folder: "inspire-ai-profilePictures" }
        );
        imageUrl = result.secure_url;
      }

      // Handle the cover image upload to Cloudinary
      if (req.files["coverImage"]) {
        const result = await cloudinary.uploader.upload(
          req.files["coverImage"][0].path,
          { folder: "inspire-ai-coverImages" }
        );
        coverImageUrl = result.secure_url;
      }

      // Construct the update object based on provided data
      const updateData = {
        ...(userName && { userName }),
        ...(bio && { bio }),
        ...(wesite && { wesite }),
        ...(email && { email }),
        ...(imageUrl && { profileImage: imageUrl }),
        ...(coverImageUrl && { coverImage: coverImageUrl }),
      };

      const updatedUser = await userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).send({ message: "User not found." });
      }
      const link = await linkModal.findOne({ userId: updatedUser._id });
      res.status(201).json({
        message: "User updated successfully",
        user: updatedUser,
        link,
      });
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).send({ message: error.message });
    }
  }
);

userRouter.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await userModel.findById(userId).exec();
    const link = await linkModal.findOne({ userId: user?._id });
    res.status(200).json({ data : user, link });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: error.message });
  }
});

export default userRouter;
