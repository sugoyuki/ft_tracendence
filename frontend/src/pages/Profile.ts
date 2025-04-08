import { createAuthContext } from '../contexts/authContext';

export default function Profile(): HTMLElement {
  // Get auth context
  const authContext = createAuthContext();
  const user = authContext.getUser();
  
  // Create container
  const container = document.createElement('div');
  container.className = 'container mx-auto px-4 py-8';
  
  // Page header
  const pageHeader = document.createElement('div');
  pageHeader.className = 'mb-8';
  
  const pageTitle = document.createElement('h1');
  pageTitle.className = 'text-2xl font-bold';
  pageTitle.textContent = 'My Profile';
  
  pageHeader.appendChild(pageTitle);
  
  // Profile content
  const profileContent = document.createElement('div');
  profileContent.className = 'grid grid-cols-1 lg:grid-cols-3 gap-8';
  
  // Profile card
  const profileCard = document.createElement('div');
  profileCard.className = 'card';
  
  // Profile avatar
  const avatarSection = document.createElement('div');
  avatarSection.className = 'flex flex-col items-center justify-center mb-6';
  
  const avatar = document.createElement('div');
  avatar.className = 'w-24 h-24 rounded-full bg-primary flex items-center justify-center text-3xl font-bold mb-4';
  avatar.textContent = user?.username.charAt(0).toUpperCase() || 'U';
  
  const username = document.createElement('h2');
  username.className = 'text-xl font-bold text-center';
  username.textContent = user?.username || 'Username';
  
  const email = document.createElement('p');
  email.className = 'text-gray-400 text-center';
  email.textContent = user?.email || 'email@example.com';
  
  avatarSection.appendChild(avatar);
  avatarSection.appendChild(username);
  avatarSection.appendChild(email);
  
  // Edit profile button
  const editButton = document.createElement('button');
  editButton.className = 'btn-outline w-full mt-4';
  editButton.textContent = 'Edit Profile';
  editButton.addEventListener('click', openEditProfileModal);
  
  // Last login information
  const lastLoginInfo = document.createElement('div');
  lastLoginInfo.className = 'mt-6 pt-6 border-t border-gray-700';
  lastLoginInfo.innerHTML = `
    <p class="text-sm text-gray-400">Member since</p>
    <p>${new Date().toLocaleDateString()}</p>
  `;
  
  // Assemble profile card
  profileCard.appendChild(avatarSection);
  profileCard.appendChild(editButton);
  profileCard.appendChild(lastLoginInfo);
  
  // Stats card
  const statsCard = document.createElement('div');
  statsCard.className = 'card lg:col-span-2';
  
  const statsHeader = document.createElement('div');
  statsHeader.className = 'flex justify-between items-center mb-4';
  
  const statsTitle = document.createElement('h2');
  statsTitle.className = 'text-xl font-bold';
  statsTitle.textContent = 'Game Statistics';
  
  statsHeader.appendChild(statsTitle);
  
  // Stats content
  const statsContent = document.createElement('div');
  statsContent.className = 'grid grid-cols-2 sm:grid-cols-4 gap-4';
  
  const statItems = [
    { label: 'Games Played', value: '0' },
    { label: 'Wins', value: '0' },
    { label: 'Losses', value: '0' },
    { label: 'Win Rate', value: '0%' }
  ];
  
  statItems.forEach(item => {
    const statBox = document.createElement('div');
    statBox.className = 'bg-background-dark rounded-lg p-4 text-center';
    
    const statValue = document.createElement('div');
    statValue.className = 'text-2xl font-bold mb-1';
    statValue.textContent = item.value;
    
    const statLabel = document.createElement('div');
    statLabel.className = 'text-sm text-gray-400';
    statLabel.textContent = item.label;
    
    statBox.appendChild(statValue);
    statBox.appendChild(statLabel);
    
    statsContent.appendChild(statBox);
  });
  
  // Assemble stats card
  statsCard.appendChild(statsHeader);
  statsCard.appendChild(statsContent);
  
  // Game history section
  const gameHistorySection = document.createElement('div');
  gameHistorySection.className = 'card mt-8 lg:col-span-3';
  
  const gameHistoryHeader = document.createElement('div');
  gameHistoryHeader.className = 'flex justify-between items-center mb-4';
  
  const gameHistoryTitle = document.createElement('h2');
  gameHistoryTitle.className = 'text-xl font-bold';
  gameHistoryTitle.textContent = 'Game History';
  
  gameHistoryHeader.appendChild(gameHistoryTitle);
  
  // Game history list
  const gameHistoryList = document.createElement('div');
  gameHistoryList.className = 'overflow-x-auto';
  gameHistoryList.innerHTML = `
    <table class="w-full">
      <thead>
        <tr class="bg-background-dark">
          <th class="p-3 text-left">Date</th>
          <th class="p-3 text-left">Opponent</th>
          <th class="p-3 text-left">Score</th>
          <th class="p-3 text-left">Result</th>
        </tr>
      </thead>
      <tbody id="game-history-body">
        <tr>
          <td class="p-3 text-center" colspan="4">Loading game history...</td>
        </tr>
      </tbody>
    </table>
  `;
  
  // Assemble game history section
  gameHistorySection.appendChild(gameHistoryHeader);
  gameHistorySection.appendChild(gameHistoryList);
  
  // Assemble profile content
  profileContent.appendChild(profileCard);
  profileContent.appendChild(statsCard);
  profileContent.appendChild(gameHistorySection);
  
  // Assemble page
  container.appendChild(pageHeader);
  container.appendChild(profileContent);
  
  // Load user game history
  loadGameHistory();
  
  // Load user stats
  loadUserStats();
  
  // Functions
  async function loadGameHistory() {
    const gameHistoryBody = document.getElementById('game-history-body');
    if (!gameHistoryBody) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/users/${user?.id}/games`, {
        headers: {
          'Authorization': `Bearer ${authContext.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load game history');
      }
      
      const data = await response.json();
      
      if (data.games && data.games.length > 0) {
        // Clear loading message
        gameHistoryBody.innerHTML = '';
        
        // Add game history rows
        data.games.forEach((game: any) => {
          const isPlayer1 = game.player1_id === user?.id;
          const opponentName = isPlayer1 ? game.player2_name : game.player1_name;
          const userScore = isPlayer1 ? game.player1_score : game.player2_score;
          const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;
          
          let result = 'Draw';
          let resultClass = 'text-gray-400';
          
          if (game.status === 'finished') {
            if (userScore > opponentScore) {
              result = 'Win';
              resultClass = 'text-green-500';
            } else if (userScore < opponentScore) {
              result = 'Loss';
              resultClass = 'text-red-500';
            }
          } else {
            result = 'In Progress';
            resultClass = 'text-yellow-500';
          }
          
          const row = document.createElement('tr');
          row.className = 'border-b border-gray-700';
          row.innerHTML = `
            <td class="p-3">${new Date(game.created_at).toLocaleDateString()}</td>
            <td class="p-3">${opponentName}</td>
            <td class="p-3">${userScore} - ${opponentScore}</td>
            <td class="p-3"><span class="${resultClass}">${result}</span></td>
          `;
          
          // Add click event to navigate to game
          row.style.cursor = 'pointer';
          row.addEventListener('click', () => {
            window.location.href = `/game/${game.id}`;
          });
          
          gameHistoryBody.appendChild(row);
        });
      } else {
        gameHistoryBody.innerHTML = `
          <tr>
            <td class="p-3 text-center text-gray-400" colspan="4">No games played yet</td>
          </tr>
        `;
      }
    } catch (error) {
      console.error('Error loading game history:', error);
      
      if (gameHistoryBody) {
        gameHistoryBody.innerHTML = `
          <tr>
            <td class="p-3 text-center text-red-500" colspan="4">
              Failed to load game history
              <button id="retry-history" class="btn-primary ml-2 text-sm py-1 px-2">Retry</button>
            </td>
          </tr>
        `;
        
        const retryButton = document.getElementById('retry-history');
        if (retryButton) {
          retryButton.addEventListener('click', loadGameHistory);
        }
      }
    }
  }
  
  async function loadUserStats() {
    try {
      const response = await fetch(`http://localhost:8000/api/users/${user?.id}/games`, {
        headers: {
          'Authorization': `Bearer ${authContext.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load user stats');
      }
      
      const data = await response.json();
      
      if (data.games && data.games.length > 0) {
        // Calculate stats
        let gamesPlayed = 0;
        let wins = 0;
        let losses = 0;
        
        data.games.forEach((game: any) => {
          if (game.status === 'finished') {
            gamesPlayed++;
            
            const isPlayer1 = game.player1_id === user?.id;
            const userScore = isPlayer1 ? game.player1_score : game.player2_score;
            const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;
            
            if (userScore > opponentScore) {
              wins++;
            } else if (userScore < opponentScore) {
              losses++;
            }
          }
        });
        
        // Calculate win rate
        const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
        
        // Update stat boxes
        const statBoxes = statsContent.querySelectorAll('.bg-background-dark');
        
        if (statBoxes[0]) statBoxes[0].querySelector('.text-2xl').textContent = String(gamesPlayed);
        if (statBoxes[1]) statBoxes[1].querySelector('.text-2xl').textContent = String(wins);
        if (statBoxes[2]) statBoxes[2].querySelector('.text-2xl').textContent = String(losses);
        if (statBoxes[3]) statBoxes[3].querySelector('.text-2xl').textContent = `${winRate}%`;
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }
  
  function openEditProfileModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-background-light p-6 rounded-lg max-w-md w-full';
    
    // Modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'flex justify-between items-center mb-4';
    
    const modalTitle = document.createElement('h2');
    modalTitle.className = 'text-xl font-bold';
    modalTitle.textContent = 'Edit Profile';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'text-gray-400 hover:text-white';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      modal.remove();
    });
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Modal form
    const form = document.createElement('form');
    form.className = 'space-y-4';
    
    // Username input
    const usernameGroup = document.createElement('div');
    
    const usernameLabel = document.createElement('label');
    usernameLabel.className = 'block text-sm font-medium mb-2';
    usernameLabel.textContent = 'Username';
    
    const usernameInput = document.createElement('input');
    usernameInput.className = 'input w-full';
    usernameInput.type = 'text';
    usernameInput.value = user?.username || '';
    usernameInput.required = true;
    
    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(usernameInput);
    
    // Avatar URL input (optional)
    const avatarGroup = document.createElement('div');
    
    const avatarLabel = document.createElement('label');
    avatarLabel.className = 'block text-sm font-medium mb-2';
    avatarLabel.textContent = 'Avatar URL (optional)';
    
    const avatarInput = document.createElement('input');
    avatarInput.className = 'input w-full';
    avatarInput.type = 'url';
    avatarInput.placeholder = 'https://example.com/avatar.jpg';
    avatarInput.value = user?.avatar || '';
    
    avatarGroup.appendChild(avatarLabel);
    avatarGroup.appendChild(avatarInput);
    
    // Error message element
    const errorMessage = document.createElement('div');
    errorMessage.className = 'text-red-500 text-sm hidden';
    
    // Form buttons
    const buttonsGroup = document.createElement('div');
    buttonsGroup.className = 'flex justify-end space-x-2';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn-outline';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
      modal.remove();
    });
    
    const submitButton = document.createElement('button');
    submitButton.className = 'btn-primary';
    submitButton.type = 'submit';
    submitButton.textContent = 'Save Changes';
    
    buttonsGroup.appendChild(cancelButton);
    buttonsGroup.appendChild(submitButton);
    
    // Assemble form
    form.appendChild(usernameGroup);
    form.appendChild(avatarGroup);
    form.appendChild(errorMessage);
    form.appendChild(buttonsGroup);
    
    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    
    // Add modal to document
    document.body.appendChild(modal);
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newUsername = usernameInput.value.trim();
      const newAvatarUrl = avatarInput.value.trim();
      
      if (!newUsername) {
        errorMessage.textContent = 'Username is required';
        errorMessage.classList.remove('hidden');
        return;
      }
      
      try {
        // Show loading state
        submitButton.textContent = 'Saving...';
        submitButton.disabled = true;
        errorMessage.classList.add('hidden');
        
        // Update profile
        const response = await fetch(`http://localhost:8000/api/users/${user?.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authContext.getToken()}`
          },
          body: JSON.stringify({
            username: newUsername,
            avatar: newAvatarUrl || undefined
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update profile');
        }
        
        const data = await response.json();
        
        // Update local user data
        const updatedUser = {
          ...user,
          username: data.user.username,
          avatar: data.user.avatar
        };
        
        // Update in localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Refresh user context
        await authContext.refreshUser();
        
        // Close modal and refresh page
        modal.remove();
        window.location.reload();
      } catch (error) {
        // Show error message
        errorMessage.textContent = error instanceof Error ? error.message : 'Failed to update profile';
        errorMessage.classList.remove('hidden');
        
        // Reset button
        submitButton.textContent = 'Save Changes';
        submitButton.disabled = false;
      }
    });
  }
  
  return container;
}
