export default function Home(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex flex-col items-center';
  
  // Hero section
  const hero = document.createElement('div');
  hero.className = 'w-full bg-background-dark py-16 px-4 flex flex-col items-center';
  
  const title = document.createElement('h1');
  title.className = 'text-5xl font-bold mb-4 text-center';
  title.textContent = 'Welcome to ft_transcendence';
  
  const subtitle = document.createElement('p');
  subtitle.className = 'text-xl text-gray-300 mb-8 text-center max-w-2xl';
  subtitle.textContent = 'Experience the classic Pong game with real-time multiplayer capabilities. Challenge your friends or join tournaments!';
  
  const ctaButton = document.createElement('button');
  ctaButton.className = 'btn-primary text-lg py-3 px-8';
  ctaButton.textContent = 'Play Now';
  ctaButton.addEventListener('click', () => {
    window.location.href = '/games';
  });
  
  hero.appendChild(title);
  hero.appendChild(subtitle);
  hero.appendChild(ctaButton);
  
  // Features section removed as requested
  
  // How to play section removed as requested
  
  // Call to action section removed as requested
  
  // Assemble the page
  container.appendChild(hero);
  
  return container;
}
