import { Request } from "express";

interface CustomRequest extends Request {
  authData?: {
    address: string;
  };
  files: {
    [fieldname: string]: File[];
  } | File[];
}