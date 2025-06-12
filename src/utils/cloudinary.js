import {v2 as cloudinary} from "cloudinary"
import fs from "fs" // fs is a file system library comes in node.js (Read docs)


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


const uploadCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;

        // Read docs for upload method and its options
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        // file has been uploaded successfully
        // console.log("cloudinary response: ", response);
        // console.log(`File has been uploaded successfully: ${response.url}`);

        fs.unlinkSync(localFilePath)

        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary files as the upload operation got failed
        return null;
    }
}

const oldImageToBeDeleted = async (public_id) =>{

    try {
        const deleteResponse = await cloudinary.uploader.destroy(public_id)
    
        return deleteResponse;
    } catch (error) {
        console.log("Error: ",error);
    }

}

export {uploadCloudinary, oldImageToBeDeleted};