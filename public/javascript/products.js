document.addEventListener('DOMContentLoaded', function () {
    const MODE = document.getElementById('update') ? 'edit' : 'add';
    const form = document.getElementById('product-form');

    const imageCropperModal = new bootstrap.Modal(document.getElementById('image-cropper-modal'), {});

    let cropper;
    let orginalImages = new Map;
    let selectedFiles = [];

    const imageInput = document.getElementById('product_images');
    const imagePreviewContainer = document.getElementById('image-preview');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropSaveButton = document.getElementById('crop-save');


    function initImageCropper(modal) {
        let currentImage;

        const handleImageClick = (img) => {
            if (!orginalImages.has(img)) {
                orginalImages.set(img, img.src);
            }
            currentImage = img;
            imageToCrop.src = orginalImages.get(img) || img.src;
            modal.show();
        };

        const handleCropSave = (button) => {
            button.addEventListener('click', () => {
                if (cropper) {
                    const canvas = cropper.getCroppedCanvas();
                    if (canvas) {
                        canvas.toBlob((blob) => {
                            const url = URL.createObjectURL(blob);
                            currentImage.src = url;
                            modal.hide();
                        }, 'image/jpeg');
                    }
                }
            });
        };

        modal._element.addEventListener('shown.bs.modal', () => {
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 1,
                viewMode: 2,
                autoCropArea: 1,
                guides: true,
                zoomable: true
            });
        });

        modal._element.addEventListener('hidden.bs.modal', () => {
            cropper.destroy();
            cropper = null;
        });

        return { handleImageClick, handleCropSave };
    }

    if (imageCropperModal && imageCropperModal._element) {
        const { handleImageClick, handleCropSave } = initImageCropper(imageCropperModal);
        handleCropSave(cropSaveButton)

        imagePreviewContainer.addEventListener('click', (event) => {
            if (event.target.matches('img')) {
                handleImageClick(event.target);
            }
        })
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.classList.add('img-thumbnail');
        img.style.cursor = 'pointer';
        img.loading = 'lazy';

        orginalImages.set(img, e.target.result);

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('img-container');
        imageContainer.append(img);

        const deleteButton = createDeleteButton(imageContainer);
        imageContainer.appendChild(deleteButton);

        imagePreviewContainer.appendChild(imageContainer);
    }

    const createDeleteButton = (index) => {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('btn', 'btn-danger', 'btn-sm');
        deleteButton.style.position = 'absolute';
        deleteButton.style.top = '10px';
        deleteButton.style.right = '10px';

        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            selectedFiles.splice(index, 1);
            updateImagePreview()
        })

        return deleteButton;
    };

    function updateImagePreview() {

        const croppedSrcs = [];
        imagePreviewContainer.querySelectorAll('img').forEach((img, index) => {
            if (img.src.startsWith('blob:')) {
                croppedSrcs[index] = img.src;
            }
        });

        imagePreviewContainer.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement('img');
                img.src = croppedSrcs[index] || e.target.result;

                img.classList.add('img-thumbnail');
                img.style.cursor = 'pointer';
                img.loading = 'lazy';

                orginalImages.set(img, e.target.result);

                const imageContainer = document.createElement('div');
                imageContainer.classList.add('img-container');
                imageContainer.appendChild(img);

                const deleteButton = createDeleteButton(index);
                imageContainer.appendChild(deleteButton);

                imagePreviewContainer.appendChild(imageContainer);
            };
            reader.readAsDataURL(file);
        });
    }

    imageInput.addEventListener('change', (event) => {
        const newFiles = Array.from(event.target.files);
        selectedFiles = [...selectedFiles, ...newFiles];

        event.target.value = '';

        updateImagePreview();
    })

    const validateForm = () => {
        const name = document.getElementById('product_name').value.trim();
        const brand = document.getElementById('product_brand').value;
        console.log(brand);
        const description = document.getElementById('product_description').value.trim();
        const processor = document.getElementById('product_processor').value;
        const ram = document.getElementById('product_ram').value;
        const storage = document.getElementById("product_storage").value;
        const graphicsCard = document.getElementById('product_graphicsCard').value;
        const color = document.getElementById('product_color').value.trim();
        const price = document.getElementById('product_regularPrice').value.trim();
        const salePrice = document.getElementById('product_salesPrice').value.trim();
        const stock = document.getElementById('product_stockAvailability').value.trim();
        const images = selectedFiles.length;
        const categories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);

        let isValid = true;
        let errors = {};

        if (!name) {
            errors.name = 'Product name is required.';
            isValid = false;
        }
        if (!brand) {
            errors.brand = 'Brand is required.';
            isValid = false;
        }
        if (!description) {
            errors.description = 'Description is required.';
            isValid = false;
        }
        if (!processor) {
            errors.processor = 'Processor is required.';
            isValid = false;
        }
        if (!ram) {
            errors.ram = 'RAM is required.';
            isValid = false;
        }
        if (!storage) {
            errors.storage = 'Storage is required.';
            isValid = false;
        }
        if (!graphicsCard) {
            errors.graphicsCard = 'Graphics card is required';
            isValid = false;
        }
        if (!color) {
            errors.color = 'Color is required.';
            isValid = false;
        }
        if (!price || isNaN(Number(price)) || Number(price) <= 0) {
            errors.price = 'This field must be a positive number.';
            isValid = false;
        }
        if (!stock || isNaN(Number(stock)) || Number(stock) < 0) {
            errors.stock = 'This field must be a positive number.';
            isValid = false;
        }
        if (images === 0) {
            errors.images = 'At least one image is required.';
            isValid = false;
        }
        else if (images > 5) {
            errors.images = 'Should not exceed 5 images.';
            isValid = false;
        }
        if (categories.length === 0) {
            errors.categories = 'At least one category is required.';
            isValid = false;
        }
        if (salePrice !== '') {
            const sp = Number(salePrice);
            const rp = Number(price);
            if (isNaN(sp) || sp < 0) {
                errors.salePrice = 'Sales price must be 0 or more.';
                isValid = false;
            } else if (sp >= rp) {
                errors.salePrice = 'Sales price must be less then regular price.';
                isValid = false;
            }
        }

        Object.keys(errors).forEach(key => {
            document.getElementById(`${key}-error`).textContent = errors[key];
        });

        return isValid;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

        if (!validateForm()) return;

        const publishButton = document.getElementById('publish');
        publishButton.disabled = true;
        publishButton.textContent = 'Publishing...';

        const formData = new FormData();

        formData.append('name', document.getElementById('product_name').value.trim());
        formData.append('brand', document.getElementById('product_brand').value);
        formData.append('description', document.getElementById('product_description').value);
        formData.append('processor', document.getElementById('product_processor').value);
        formData.append('ram', document.getElementById('product_ram').value);
        formData.append('storage', document.getElementById('product_storage').value);
        formData.append('graphicsCard', document.getElementById('product_graphicsCard').value);
        formData.append('color', document.getElementById('product_color').value);
        formData.append('price', document.getElementById('product_regularPrice').value);
        formData.append('salePrice', document.getElementById('product_salesPrice').value);
        formData.append('stock', document.getElementById('product_stockAvailability').value);
        formData.append('isPublished', document.getElementById('product_status').value);

        const categories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
        formData.append('categories', JSON.stringify(categories));

        selectedFiles.forEach((file, index) => formData.append('images', file));

        try {
            const response = await axios.post('/admin/products/add', formData);

            if (response.data.success) {
                Swal.fire({
                    title: "Success!",
                    text: "Product saved successfully.",
                    icon: "success"
                });
                resetForm();
            } else {
                Swal.fire({
                    title: "Error!",
                    text: response.data.message || "There was an error saving the product.",
                    icon: "error"
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                title: "Error!",
                text: "There was an error saving the product.",
                icon: "error"
            });
        } finally {
            publishButton.disabled = false
            publishButton.textContent = 'Publish';
        }
    });

    const resetForm = () => {
        const form = document.getElementById('product-form');

        if (form) {
            form.reset();

            if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';

            selectedFiles = [];

            const fileInput = document.getElementById('product_images');
            if (fileInput) fileInput.value = '';

            const selects = document.querySelectorAll('select');
            selects.forEach(select => select.value = '');

            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = false);

            const errorMessages = document.querySelectorAll('.form-error');
            errorMessages.forEach(errorMessage => errorMessage.textContent = '');
        } else {
            console.error('Form not found');
        }
    };
})
