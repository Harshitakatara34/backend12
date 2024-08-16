import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from "express";
import { CustomRequest } from '../../custom';

export function authenticateToken(req: CustomRequest, res: Response, next: NextFunction) {
    
    const token = req.cookies.accesstoken

    // console.log("token-in middle ware : ", token);
    

    const jwtSecret = process.env.JWT_SECRET

    if (token == null) return res.sendStatus(401)

    jwt.verify(token, jwtSecret, (err , authData) => {
      // console.log(err)
  
      if (err) return res.sendStatus(403)
  
      req.authData = authData as { address: string }
      // console.log("authData - in middleware: ", req.authData);
      
      next()
    })
  }