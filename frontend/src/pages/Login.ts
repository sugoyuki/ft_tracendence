import { createAuthContext } from '../contexts/authContext';

export default function Login(): HTMLElement {
  // Get auth context
  const authContext = createAuthContext();

  // Create container
  const container = document.createElement('div');
  container.className = 'flex justify-center items-center min-h-[80vh] px-4';
  
  // Create login card
  const card = document.createElement('div');
  card.className = 'card w-full max-w-md';
  
  // Create form header
  const header = document.createElement('div');
  header.className = 'mb-6 text-center';
  
  const title = document.createElement('h1');
  title.className = 'text-2xl font-bold mb-2';
  title.textContent = 'Login to your Account';
  
  const subtitle = document.createElement('p');
  subtitle.className = 'text-gray-400';
  subtitle.textContent = 'Enter your credentials to access your account';
  
  header.appendChild(title);
  header.appendChild(subtitle);
  
  // Create form
  const form = document.createElement('form');
  form.className = 'space-y-4';
  
  // Email input
  const emailGroup = document.createElement('div');
  
  const emailLabel = document.createElement('label');
  emailLabel.className = 'block text-sm font-medium mb-2';
  emailLabel.textContent = 'Email';
  
  const emailInput = document.createElement('input');
  emailInput.className = 'input w-full';
  emailInput.type = 'email';
  emailInput.placeholder = 'Enter your email';
  emailInput.required = true;
  
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  
  // Password input
  const passwordGroup = document.createElement('div');
  
  const passwordLabel = document.createElement('label');
  passwordLabel.className = 'block text-sm font-medium mb-2';
  passwordLabel.textContent = 'Password';
  
  const passwordInput = document.createElement('input');
  passwordInput.className = 'input w-full';
  passwordInput.type = 'password';
  passwordInput.placeholder = 'Enter your password';
  passwordInput.required = true;
  
  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(passwordInput);
  
  // Error message element
  const errorMessage = document.createElement('div');
  errorMessage.className = 'text-red-500 text-sm hidden';
  
  // Submit button
  const submitButton = document.createElement('button');
  submitButton.className = 'btn-primary w-full py-2';
  submitButton.type = 'submit';
  submitButton.textContent = 'Login';
  
  // Register link
  const registerLink = document.createElement('div');
  registerLink.className = 'text-center mt-4';
  registerLink.innerHTML = "Don't have an account? <a href='/register' class='text-primary hover:underline'>Register</a>";
  
  // Add form submission handler
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Show loading state
    submitButton.textContent = 'Logging in...';
    submitButton.disabled = true;
    errorMessage.classList.add('hidden');
    
    // Get form values
    const email = emailInput.value;
    const password = passwordInput.value;
    
    try {
      // Attempt login
      const success = await authContext.login(email, password);
      
      if (success) {
        // Navigate to home on success
        window.location.href = '/';
      } else {
        // Show error message
        errorMessage.textContent = 'Invalid email or password';
        errorMessage.classList.remove('hidden');
        
        // Reset button
        submitButton.textContent = 'Login';
        submitButton.disabled = false;
      }
    } catch (error) {
      // Show error message
      errorMessage.textContent = error instanceof Error ? error.message : 'Login failed';
      errorMessage.classList.remove('hidden');
      
      // Reset button
      submitButton.textContent = 'Login';
      submitButton.disabled = false;
    }
  });
  
  // Assemble the form
  form.appendChild(emailGroup);
  form.appendChild(passwordGroup);
  form.appendChild(errorMessage);
  form.appendChild(submitButton);
  
  // Assemble the card
  card.appendChild(header);
  card.appendChild(form);
  card.appendChild(registerLink);
  
  // Add to container
  container.appendChild(card);
  
  // Register link handling
  const registerAnchor = registerLink.querySelector('a');
  if (registerAnchor) {
    registerAnchor.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/register';
    });
  }
  
  return container;
}
