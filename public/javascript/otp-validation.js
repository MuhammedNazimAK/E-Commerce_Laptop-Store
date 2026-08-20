let timeLeft = 60;
const timerElement = document.getElementById('timer');
const resendButton = document.getElementById('resendButton');
const toast = document.getElementById('toast');
const otpForm = document.getElementById('otpForm');
const otpInputs = document.querySelectorAll('.otp-inputs input');
const otpError = document.getElementById('otpError');

function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    timerElement.innerHTML = `${minutes}:${seconds}`;
    
    if (timeLeft === 0) {
        clearInterval(timerInterval);
        resendButton.disabled = false;
    } else {
        timeLeft--;
    }
}

let timerInterval = setInterval(updateTimer, 1000);

function showToast(message, isError = false) {
    toast.textContent = message;
    toast.className = `toast position-fixed top-0 end-0 m-3 p-3 text-white rounded ${isError ? 'bg-danger' : 'bg-success'}`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 3000);
}

async function resendOTP() {
    resendButton.disabled = true;
    resendButton.textContent = 'Sending...';
    try {
        const response = await axios.post('/resend-otp');
        if (!response.data.success) {
            throw new Error(response.data.message || 'Failed to resend OTP');
        } else {
            timeLeft = 60;
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
            resendButton.textContent = 'Resend OTP';
            showToast('New OTP sent successfully!');
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        showToast(error.message || 'Failed to resend OTP. Please try again.', true);
        resendButton.disabled = false;
        resendButton.textContent = 'Resend OTP';
    }
}

resendButton.addEventListener('click', resendOTP);

otpInputs.forEach((input, index) => {
    input.addEventListener('input', function() {
        if (this.value.length === 1) {
            if (index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        }
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && this.value.length === 0) {
            if (index > 0) {
                otpInputs[index - 1].focus();
            }
        }
    });
});

otpForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    let otp = '';
    otpInputs.forEach(input => {
        otp += input.value;
    });

    if (otp.length !== 6) {
        otpError.textContent = 'Please enter a valid 6-digit OTP';
        otpError.style.display = 'block';
    } else {
        otpError.style.display = 'none';
        try {
            const response = await axios.post('/enter-otp', { otp });
            if (!response.data.success) {
                throw new Error(response.data.message || 'Invalid OTP');
            } else {
                showToast('OTP verified successfully!');
                setTimeout(() => {
                    window.location.href = '/home';
                }, 1500);
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            showToast(error.message || 'Failed to verify OTP. Please try again.', true);
        }
    }
});