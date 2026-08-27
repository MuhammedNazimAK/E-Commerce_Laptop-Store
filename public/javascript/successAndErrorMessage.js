function showError(message) {
    Swal.fire({
        icon: "error",
        text: message,
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 3000,
    });
}

function showSuccess(message) {
    Swal.fire({
        icon: "success",
        text: message,
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 3000,
    });
}