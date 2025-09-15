// s3.js placeholder
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');


const s3 = new AWS.S3({
accessKeyId: process.env.AWS_ACCESS_KEY_ID,
secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
region: process.env.AWS_REGION
});


function presignPut(key, contentType = 'application/pdf', expires = 60 * 5) {
const params = { Bucket: process.env.S3_BUCKET, Key: key, Expires: expires, ContentType: contentType };
return s3.getSignedUrlPromise('putObject', params);
}


function presignGet(key, expires = 60 * 5) {
const params = { Bucket: process.env.S3_BUCKET, Key: key, Expires: expires };
return s3.getSignedUrlPromise('getObject', params);
}


function makeKey(prefix = 'documents', filename = 'file.pdf') {
const id = uuidv4();
return `${prefix}/${id}-${filename}`;
}


module.exports = { presignPut, presignGet, makeKey };