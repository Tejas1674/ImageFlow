const express = require('express');
const upload = require('../middleware/upload');
const controller = require('../controllers/imageController');

const router = express.Router();

// RESTful, resource-oriented endpoints under /api/images
router.post('/', upload.array('images', 10), controller.uploadImages); // create (batch)
router.get('/', controller.listImages); // list (+ ?status=&page=&limit=)
router.get('/:id', controller.getImage); // read
router.delete('/:id', controller.deleteImage); // delete

module.exports = router;
