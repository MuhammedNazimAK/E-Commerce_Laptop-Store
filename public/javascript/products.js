document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('product-form');
    const MODE = form.dataset.mode || 'add';
    const productId = form.dataset.productId;

    const submitBtn = MODE === 'edit'
        ? document.getElementById('update')
        : document.getElementById('publish');

    const CONFIG = {
        add: {
            endpoint: '/admin/products/add',
            method: 'POST',
            buttonText: {
                default: 'Publish',
                loading: 'Publishing...'
            },
            successMessage: 'Product added successfully!',
            afterSuccess: () => resetForm()
        },
        edit: {
            endpoint: `/admin/products/update/${productId}`,
            method: 'PUT',
            buttonText: {
                default: 'Update',
                loading: 'Updating...'
            },
            successMessage: 'Product updated successfully!',
            afterSuccess: () => { }
        }
    };

    const imageInput = document.getElementById('product_images');
    const imagePreviewContainer = document.getElementById('image-preview');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropSaveButton = document.getElementById('crop-save');

    const imageCropperModal = new bootstrap.Modal(document.getElementById('image-cropper-modal'), {});
    let cropper;
    let originalImages = new Map();
    let selectedFiles = [];
    let existingImages = [];

    document.getElementById('image-cropper-modal').addEventListener('hidden.bs.modal', () => {
        console.log('Modal hidden. Focus now:', document.activeElement);
    });


    if (MODE === 'edit') {
        existingImages = [];
        const existingImageElements = imagePreviewContainer.querySelectorAll('img.existing-image');

        existingImageElements.forEach(img => {
            const src = img.dataset.imgSrc;
            existingImages.push(src);
            originalImages.set(img, src);
        });
    }


    function initCropper() {
        let currentImage;
        imageCropperModal._element.addEventListener('shown.bs.modal', () => {
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 1,
                viewMode: 0,
                autoCropArea: 0.8,
                guides: true,
                zoomable: true,
                scalable: true,
                zoomOnWheel: true,
                wheelZoomRatio: 0.1,
                background: true // No grid background
            });
        });

        imageCropperModal._element.addEventListener('hidden.bs.modal', () => {
            cropper.destroy();
            cropper = null;
        });

        cropSaveButton.addEventListener('click', () => {
            if (!cropper || !currentImage) return;

            cropper.getCroppedCanvas({ fillColor: '#ffffff' }).toBlob(blob => {
                const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });

                if (currentImage.classList.contains('existing-image')) {
                    const src = currentImage.dataset.imgSrc;
                    const idx = existingImages.indexOf(src);
                    if (idx > -1) existingImages.splice(idx, 1);

                    selectedFiles.push(file);
                    currentImage.classList.remove('existing-image');
                    currentImage.removeAttribute('data-img-src');
                } else {
                    const currentSrc = originalImages.get(currentImage);
                    const idx = selectedFiles.findIndex((_, i) => {
                        const testImg = imagePreviewContainer.querySelector(`img[data-new-index="${i}"]`);
                        return testImg && originalImages.get(testImg) === currentSrc;
                    });

                    if (idx > -1) selectedFiles[idx] = file;
                }

                if (currentImage.src.startsWith('blob:')) {
                    URL.revokeObjectURL(currentImage.src);
                }

                currentImage.src = URL.createObjectURL(blob);
                updateImagePreview();
                imageCropperModal.hide();
            }, 'image/jpeg');
        });

        return {
            open: (img) => {
                currentImage = img;
                imageToCrop.src = originalImages.get(img);
                imageCropperModal.show();
            }
        };

    }

    const cropperHandlers = initCropper();

    function updateImagePreview() {
        imagePreviewContainer.innerHTML = '';

        if (MODE === 'edit') {
            existingImages.forEach(src => {
                const container = document.createElement('div');
                container.className = 'img-container';

                const img = document.createElement('img');
                img.src = src;
                img.className = 'img-thumbnail existing-image';
                img.dataset.imgSrc = src;

                originalImages.set(img, src);

                const del = document.createElement('button');
                del.className = 'btn btn-danger btn-sm delete-btn';
                del.textContent = 'Remove';

                container.append(img, del);
                imagePreviewContainer.append(container);
            });
        }

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = e => {
                const container = document.createElement('div');
                container.className = 'img-container';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'img-thumbnail';
                img.dataset.newIndex = index;

                originalImages.set(img, e.target.result);

                const del = document.createElement('button');
                del.className = 'btn btn-danger btn-sm delete-btn';
                del.textContent = 'Remove';

                container.append(img, del);
                imagePreviewContainer.append(container);
            };
            reader.readAsDataURL(file);
        });
    }


    imagePreviewContainer.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const img = event.target.closest('img');
        const del = event.target.closest('.delete-btn');

        if (img) {
            cropperHandlers.open(img);
            return;
        }

        if (del) {
            const container = del.closest('.img-container');
            const img = container.querySelector('img');

            if (img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }

            if (img.classList.contains('existing-image')) {
                const idx = existingImages.indexOf(img.dataset.imgSrc);
                if (idx > -1) existingImages.splice(idx, 1);
            } else {
                const idx = Number(img.dataset.newIndex);
                if (!isNaN(idx)) selectedFiles.splice(idx, 1);
            }

            updateImagePreview();
        }
    });

    imageInput.addEventListener('change', (e) => {
        const newFiles = Array.from(e.target.files);
        if (selectedFiles.length + existingImages.length + newFiles.length > 5) {
            Swal.fire({
                title: "Too many images!",
                text: "You can only have 5 images total.",
                icon: "warning"
            });
            e.target.value = '';
            return;
        }
        selectedFiles = [...selectedFiles, ...newFiles];
        e.target.value = '';
        updateImagePreview();
    });

    const validateForm = () => {
        const name = document.getElementById('product_name').value.trim();
        const brand = document.getElementById('product_brand').value;
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
        if (MODE === 'add' && images === 0) {
            errors.images = 'At least one image is required.';
            isValid = false;
        } else if (MODE === 'edit' && images === 0 && existingImages.length === 0) {
            errors.images = 'At least one image is required.';
            isValid = false;
        } else if (images + (MODE === 'edit' ? existingImages.length : 0) > 5) {
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
                errors.salePrice = 'Sales price must be less than regular price.';
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

        submitBtn.disabled = true;
        submitBtn.textContent = CONFIG[MODE].buttonText.loading;

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
        formData.append('isPublished', document.getElementById('product_status')?.value);

        const categories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
        formData.append('categories', JSON.stringify(categories));

        if (MODE === 'edit' && existingImages.length > 0) {
            formData.append('existingImages', JSON.stringify(existingImages));
        }

        selectedFiles.forEach((file, index) => formData.append('images', file));

        try {
            const response = await axios({ method: CONFIG[MODE].method, url: CONFIG[MODE].endpoint, data: formData });

            if (response.data.success) {
                Swal.fire({
                    title: "Success!",
                    text: CONFIG[MODE].successMessage,
                    icon: "success"
                });
                CONFIG[MODE].afterSuccess?.();
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
            submitBtn.disabled = false;
            submitBtn.textContent = CONFIG[MODE].buttonText.default;
        }
    });

    const resetForm = () => {

        form.reset();
        selectedFiles = [];

        existingImages = [];
        imagePreviewContainer.innerHTML = '';
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    };
})
