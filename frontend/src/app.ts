import { createRouter } from './router';
import { createAuthContext } from './contexts/authContext';
import { createSocketConnection } from './services/socketService';

export function initializeApp(rootElement: HTMLElement) {
  // Create auth context first
  const authContext = createAuthContext();
  
  // Create router with auth context
  const router = createRouter(authContext);
  
  // Initialize socket connection if user is authenticated
  if (authContext.isAuthenticated()) {
    createSocketConnection(authContext.getToken());
  }

  // Create header component
  const header = createHeader(authContext, router);
  
  // Create main content container
  const mainContent = document.createElement('main');
  mainContent.className = 'container mx-auto p-4';
  mainContent.id = 'main-content';
  
  // Create footer
  const footer = createFooter();
  
  // Add components to root element
  rootElement.appendChild(header);
  rootElement.appendChild(mainContent);
  rootElement.appendChild(footer);
  
  // Initialize router and render initial page
  router.init(mainContent);
}

function createHeader(authContext: any, router: any) {
  const header = document.createElement('header');
  header.className = 'bg-background-light p-4 shadow-md';
  
  const navContainer = document.createElement('div');
  navContainer.className = 'container mx-auto flex justify-between items-center';
  
  // Logo
  const logo = document.createElement('div');
  logo.className = 'text-xl font-bold text-primary';
  logo.textContent = 'ft_transcendence';
  logo.addEventListener('click', () => router.navigateTo('/'));
  logo.style.cursor = 'pointer';
  
  // Navigation links
  const nav = document.createElement('nav');
  nav.className = 'flex items-center space-x-6';
  
  const homeLink = createNavLink('Home', '/', router);
  const gamesLink = createNavLink('Games', '/games', router);
  const tournamentsLink = createNavLink('Tournaments', '/tournaments', router);
  
  nav.appendChild(homeLink);
  nav.appendChild(gamesLink);
  nav.appendChild(tournamentsLink);
  
  // Auth buttons container
  const authContainer = document.createElement('div');
  authContainer.className = 'flex items-center space-x-4';
  
  // Function to update auth buttons based on authentication state
  const updateAuthButtons = () => {
    authContainer.innerHTML = '';
    
    if (authContext.isAuthenticated()) {
      // User profile button
      const profileButton = document.createElement('button');
      profileButton.className = 'flex items-center space-x-2';
      profileButton.addEventListener('click', () => router.navigateTo('/profile'));
      
      const profileIcon = document.createElement('div');
      profileIcon.className = 'w-8 h-8 rounded-full bg-primary flex items-center justify-center';
      profileIcon.textContent = authContext.getUser()?.username?.charAt(0).toUpperCase() || 'U';
      
      const username = document.createElement('span');
      username.textContent = authContext.getUser()?.username || 'User';
      
      profileButton.appendChild(profileIcon);
      profileButton.appendChild(username);
      
      // Logout button
      const logoutButton = document.createElement('button');
      logoutButton.className = 'btn-outline';
      logoutButton.textContent = 'Logout';
      logoutButton.addEventListener('click', () => {
        authContext.logout();
        updateAuthButtons();
        router.navigateTo('/');
      });
      
      authContainer.appendChild(profileButton);
      authContainer.appendChild(logoutButton);
    } else {
      // Login button
      const loginButton = document.createElement('button');
      loginButton.className = 'btn-primary';
      loginButton.textContent = 'Login';
      loginButton.addEventListener('click', () => router.navigateTo('/login'));
      
      // Register button
      const registerButton = document.createElement('button');
      registerButton.className = 'btn-outline';
      registerButton.textContent = 'Register';
      registerButton.addEventListener('click', () => router.navigateTo('/register'));
      
      authContainer.appendChild(loginButton);
      authContainer.appendChild(registerButton);
    }
  };
  
  // Set initial auth buttons
  updateAuthButtons();
  
  // Subscribe to auth changes
  authContext.subscribe(updateAuthButtons);
  
  navContainer.appendChild(logo);
  navContainer.appendChild(nav);
  navContainer.appendChild(authContainer);
  
  header.appendChild(navContainer);
  return header;
}

function createNavLink(text: string, path: string, router: any) {
  const link = document.createElement('a');
  link.textContent = text;
  link.className = 'hover:text-primary cursor-pointer';
  link.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigateTo(path);
  });
  return link;
}

function createFooter() {
  const footer = document.createElement('footer');
  footer.className = 'bg-background-light p-4 mt-12';
  
  const container = document.createElement('div');
  container.className = 'container mx-auto flex justify-between items-center text-sm text-gray-400';
  
  const copyright = document.createElement('div');
  copyright.textContent = `© ${new Date().getFullYear()} ft_transcendence`;
  
  container.appendChild(copyright);
  footer.appendChild(container);
  
  return footer;
}
