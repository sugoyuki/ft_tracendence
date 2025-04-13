import { createAuthContext } from "../contexts/authContext";

export default function Register(): HTMLElement {
  const authContext = createAuthContext();

  const container = document.createElement("div");
  container.className = "flex justify-center items-center min-h-[80vh] px-4";

  const card = document.createElement("div");
  card.className = "card w-full max-w-md";

  const header = document.createElement("div");
  header.className = "mb-6 text-center";

  const title = document.createElement("h1");
  title.className = "text-2xl font-bold mb-2";
  title.textContent = "Create an Account";

  const subtitle = document.createElement("p");
  subtitle.className = "text-gray-400";
  subtitle.textContent = "Join ft_transcendence to play Pong with friends";

  header.appendChild(title);
  header.appendChild(subtitle);

  const form = document.createElement("form");
  form.className = "space-y-4";

  const usernameGroup = document.createElement("div");

  const usernameLabel = document.createElement("label");
  usernameLabel.className = "block text-sm font-medium mb-2";
  usernameLabel.textContent = "Username";

  const usernameInput = document.createElement("input");
  usernameInput.className = "input w-full";
  usernameInput.type = "text";
  usernameInput.placeholder = "Choose a username";
  usernameInput.required = true;
  usernameInput.minLength = 3;
  usernameInput.maxLength = 20;

  usernameGroup.appendChild(usernameLabel);
  usernameGroup.appendChild(usernameInput);

  const emailGroup = document.createElement("div");

  const emailLabel = document.createElement("label");
  emailLabel.className = "block text-sm font-medium mb-2";
  emailLabel.textContent = "Email";

  const emailInput = document.createElement("input");
  emailInput.className = "input w-full";
  emailInput.type = "email";
  emailInput.placeholder = "Enter your email";
  emailInput.required = true;

  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);

  const passwordGroup = document.createElement("div");

  const passwordLabel = document.createElement("label");
  passwordLabel.className = "block text-sm font-medium mb-2";
  passwordLabel.textContent = "Password";

  const passwordInput = document.createElement("input");
  passwordInput.className = "input w-full";
  passwordInput.type = "password";
  passwordInput.placeholder = "Create a password";
  passwordInput.required = true;
  passwordInput.minLength = 6;

  passwordGroup.appendChild(passwordLabel);
  passwordGroup.appendChild(passwordInput);

  const confirmPasswordGroup = document.createElement("div");

  const confirmPasswordLabel = document.createElement("label");
  confirmPasswordLabel.className = "block text-sm font-medium mb-2";
  confirmPasswordLabel.textContent = "Confirm Password";

  const confirmPasswordInput = document.createElement("input");
  confirmPasswordInput.className = "input w-full";
  confirmPasswordInput.type = "password";
  confirmPasswordInput.placeholder = "Confirm your password";
  confirmPasswordInput.required = true;

  confirmPasswordGroup.appendChild(confirmPasswordLabel);
  confirmPasswordGroup.appendChild(confirmPasswordInput);

  const errorMessage = document.createElement("div");
  errorMessage.className = "text-red-500 text-sm hidden";

  const submitButton = document.createElement("button");
  submitButton.className = "btn-primary w-full py-2";
  submitButton.type = "submit";
  submitButton.textContent = "Register";

  const loginLink = document.createElement("div");
  loginLink.className = "text-center mt-4";
  loginLink.innerHTML = "Already have an account? <a href='/login' class='text-primary hover:underline'>Login</a>";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (passwordInput.value !== confirmPasswordInput.value) {
      errorMessage.textContent = "Passwords do not match";
      errorMessage.classList.remove("hidden");
      return;
    }

    submitButton.textContent = "Registering...";
    submitButton.disabled = true;
    errorMessage.classList.add("hidden");

    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      const success = await authContext.register(username, email, password);

      if (success) {
        const successMessage = document.createElement("div");
        successMessage.className =
          "bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4";
        successMessage.textContent = "Registration successful! You can now login.";

        form.innerHTML = "";
        form.appendChild(successMessage);

        const loginButton = document.createElement("button");
        loginButton.className = "btn-primary w-full py-2 mt-4";
        loginButton.textContent = "Go to Login";
        loginButton.addEventListener("click", () => {
          window.location.href = "/login";
        });

        form.appendChild(loginButton);
      } else {
        errorMessage.textContent = "Registration failed. Please try again.";
        errorMessage.classList.remove("hidden");

        submitButton.textContent = "Register";
        submitButton.disabled = false;
      }
    } catch (error) {
      errorMessage.textContent = error instanceof Error ? error.message : "Registration failed";
      errorMessage.classList.remove("hidden");

      submitButton.textContent = "Register";
      submitButton.disabled = false;
    }
  });

  form.appendChild(usernameGroup);
  form.appendChild(emailGroup);
  form.appendChild(passwordGroup);
  form.appendChild(confirmPasswordGroup);
  form.appendChild(errorMessage);
  form.appendChild(submitButton);

  card.appendChild(header);
  card.appendChild(form);
  card.appendChild(loginLink);

  container.appendChild(card);

  const loginAnchor = loginLink.querySelector("a");
  if (loginAnchor) {
    loginAnchor.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/login";
    });
  }

  return container;
}
