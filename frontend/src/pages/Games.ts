import { createAuthContext } from '../contexts/authContext';
import { getSocketInstance, on } from '../services/socketService';

export default function Games(): HTMLElement {
  // Get auth context
  const authContext = createAuthContext();
  const user = authContext.getUser();
  const isAuthenticated = authContext.isAuthenticated();
  
  // Create container
  const container = document.createElement('div');
  container.className = 'container mx-auto px-4 py-8';
  
  // Page header
  const pageHeader = document.createElement('div');
  pageHeader.className = 'flex justify-between items-center mb-8';
  
  const pageTitle = document.createElement('h1');
  pageTitle.className = 'text-2xl font-bold';
  pageTitle.textContent = 'Games';
  
  const newGameButton = document.createElement('button');
  newGameButton.className = 'btn-primary';
  newGameButton.textContent = 'New Game';
  newGameButton.addEventListener('click', () => openNewGameModal());
  
  // Disable button if not authenticated
  if (!isAuthenticated) {
    newGameButton.disabled = true;
    newGameButton.title = 'Login to create a game';
    newGameButton.className = 'btn-primary opacity-50 cursor-not-allowed';
  }
  
  pageHeader.appendChild(pageTitle);
  pageHeader.appendChild(newGameButton);
  
  // Games grid
  const gamesGrid = document.createElement('div');
  gamesGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  gamesGrid.id = 'games-grid';
  
  // Loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'flex justify-center items-center py-12';
  loadingIndicator.innerHTML = '<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary"></div><p class="ml-3">Loading games...</p>';
  gamesGrid.appendChild(loadingIndicator);
  
  // No games message
  const noGamesMessage = document.createElement('div');
  noGamesMessage.className = 'col-span-full text-center py-12 hidden';
  noGamesMessage.innerHTML = `
    <p class="text-xl text-gray-400 mb-4">No active games found</p>
    <p class="mb-4">Be the first to create a new game!</p>
    <button class="btn-primary" id="no-games-create-button">Create Game</button>
  `;
  
  if (!isAuthenticated) {
    noGamesMessage.innerHTML = `
      <p class="text-xl text-gray-400 mb-4">No active games found</p>
      <p class="mb-4">Login to create a new game or join a tournament</p>
      <button class="btn-primary" id="no-games-login-button">Login</button>
    `;
  }
  
  gamesGrid.appendChild(noGamesMessage);
  
  // Add components to container
  container.appendChild(pageHeader);
  container.appendChild(gamesGrid);
  
  // Store event unsubscribe functions
  const unsubscribeFunctions: (() => void)[] = [];
  
  // Cleanup function to remove event listeners when component is removed
  const cleanup = () => {
    console.log('Cleaning up Games component event listeners');
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
  };
  
  // Setup observer to detect when this component is removed from DOM
  const setupCleanupObserver = () => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === container) {
            cleanup();
            observer.disconnect();
          }
        });
      });
    });
    
    // Start observing the parent element for child removals
    if (container.parentElement) {
      observer.observe(container.parentElement, { childList: true });
    }
  };
  
  // Clean up on page unload as well
  window.addEventListener('beforeunload', cleanup);
  
  // Setup socket listeners for real-time updates
  setupSocketListeners();
  
  // Fetch active games
  fetchActiveGames();
  
  // Set up cleanup observer after component is mounted
  setTimeout(setupCleanupObserver, 0);
  
  // Socket listeners for real-time game updates
  function setupSocketListeners() {
    const socket = getSocketInstance();
    if (!socket) {
      console.warn('Socket not available for game updates');
      return;
    }
    
    // Force reconnection if socket is not connected
    if (!socket.connected) {
      console.log('Socket not connected, attempting to reconnect...');
      socket.connect();
    }
    
    console.log('Setting up game event listeners...');
    
    // Listen for new games
    const unsubscribeCreated = on('game:created', (game: any) => {
      console.log('New game created:', game);
      fetchActiveGames(); // Reload the game list
    });
    unsubscribeFunctions.push(unsubscribeCreated);
    
    // Listen for game updates
    const unsubscribeUpdated = on('game:updated', (game: any) => {
      console.log('Game updated:', game);
      fetchActiveGames(); // Reload the game list
    });
    unsubscribeFunctions.push(unsubscribeUpdated);
    
    // Listen for game deletions
    const unsubscribeDeleted = on('game:deleted', (gameId: number) => {
      console.log('Game deleted:', gameId);
      fetchActiveGames(); // Reload the game list
    });
    unsubscribeFunctions.push(unsubscribeDeleted);
    
    // Debug: notify when events are registered
    console.log('Game event listeners registered successfully');
  }
  
  // Functions
  // Add refresh button to the page header
  const refreshButton = document.createElement('button');
  refreshButton.className = 'btn-outline ml-2';
  refreshButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>';
  refreshButton.title = 'Refresh game list';
  refreshButton.addEventListener('click', fetchActiveGames);
  pageHeader.appendChild(refreshButton);
  
  async function fetchActiveGames() {
    // Show loading indicator
    gamesGrid.innerHTML = '';
    loadingIndicator.classList.remove('hidden');
    gamesGrid.appendChild(loadingIndicator);
    try {
      // Build headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (isAuthenticated) {
        headers['Authorization'] = `Bearer ${authContext.getToken()}`;
      }
      
      // Get backend URL from environment variable
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      console.log(`Using backend URL: ${backendUrl}`);
      
      // 全てのゲーム（履歴含む）を取得するパラメータを追加
      const response = await fetch(`${backendUrl}/api/games?include_finished=true`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      
      const data = await response.json();
      console.log('Fetched games data:', data);
      
      // Hide loading indicator
      loadingIndicator.remove();
      
      if (data.games && data.games.length > 0) {
        // ゲームのソート: 進行中のゲームを先に、次に待機中のゲーム、最後に完了したゲームを表示
        const sortedGames = data.games.sort((a: any, b: any) => {
          // ステータスの優先順位: playing(進行中) > waiting/pending(待機中) > finished(完了)
          const statusPriority: Record<string, number> = {
            playing: 0,
            waiting: 1,
            pending: 1,
            finished: 2
          };
          return statusPriority[a.status] - statusPriority[b.status];
        });
        
        // Render sorted games
        renderGames(sortedGames);
      } else {
        // Show no games message
        noGamesMessage.classList.remove('hidden');
        
        // Add event listener to create game button
        const createButton = document.getElementById('no-games-create-button');
        if (createButton) {
          createButton.addEventListener('click', () => openNewGameModal());
        }
        
        // Add event listener to login button
        const loginButton = document.getElementById('no-games-login-button');
        if (loginButton) {
          loginButton.addEventListener('click', () => {
            window.location.href = '/login';
          });
        }
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      
      // Hide loading indicator
      loadingIndicator.remove();
      
      // Show error message
      const errorMessage = document.createElement('div');
      errorMessage.className = 'col-span-full text-center py-12';
      errorMessage.innerHTML = `
        <p class="text-xl text-red-500 mb-4">Failed to load games</p>
        <button class="btn-primary" id="retry-button">Retry</button>
      `;
      gamesGrid.appendChild(errorMessage);
      
      // Add event listener to retry button
      const retryButton = document.getElementById('retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          // Clear error message
          errorMessage.remove();
          
          // Show loading indicator again
          gamesGrid.appendChild(loadingIndicator);
          
          // Retry fetching games
          fetchActiveGames();
        });
      }
    }
  }
  
  function renderGames(games: any[]) {
    // Clear grid
    gamesGrid.innerHTML = '';
    
    // Render each game
    games.forEach(game => {
      const gameCard = createGameCard(game);
      gamesGrid.appendChild(gameCard);
    });
  }
  
  function createGameCard(game: any) {
    const card = document.createElement('div');
    card.className = 'card relative';
    
    // ゲームステータスに応じてカードの外観を変更
    if (game.status === 'finished') {
      // 完了したゲームは半透明にして古いことを示す
      card.className = 'card relative opacity-75';
    } else if (game.status === 'playing') {
      // 進行中のゲームは目立つように強調
      card.className = 'card relative border-2 border-primary';
    }
    
    // Status badge
    const statusBadge = document.createElement('div');
    
    // ステータスによってバッジの色を変更
    let badgeClass = 'absolute top-3 right-3 px-2 py-1 rounded-full text-xs ';
    
    switch (game.status) {
      case 'playing':
        badgeClass += 'bg-green-600'; // 進行中: 緑
        break;
      case 'pending':
      case 'waiting':
        badgeClass += 'bg-yellow-600'; // 待機中: 黄
        break;
      case 'finished':
        badgeClass += 'bg-blue-600'; // 完了: 青
        break;
      default:
        badgeClass += 'bg-gray-600';
    }
    
    statusBadge.className = badgeClass;
    statusBadge.textContent = game.status.charAt(0).toUpperCase() + game.status.slice(1);
    
    // Card content
    const content = document.createElement('div');
    content.className = 'mt-4';
    
    // Game title
    const title = document.createElement('h2');
    title.className = 'text-lg font-bold mb-2';
    title.textContent = `Game #${game.id}`;
    
    // Players
    const players = document.createElement('div');
    players.className = 'flex justify-between items-center mb-4';
    
    const player1 = document.createElement('div');
    player1.className = 'flex flex-col items-center';
    player1.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center mb-1">
        ${game.player1_name.charAt(0).toUpperCase()}
      </div>
      <p class="text-sm">${game.player1_name}</p>
    `;
    
    const vs = document.createElement('div');
    vs.className = 'text-sm opacity-70';
    vs.textContent = 'VS';
    
    const player2 = document.createElement('div');
    player2.className = 'flex flex-col items-center';
    player2.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mb-1">
        ${game.player2_name.charAt(0).toUpperCase()}
      </div>
      <p class="text-sm">${game.player2_name}</p>
    `;
    
    players.appendChild(player1);
    players.appendChild(vs);
    players.appendChild(player2);
    
    // Game stats
    const stats = document.createElement('div');
    stats.className = 'grid grid-cols-3 gap-2 mb-4 text-center';
    stats.innerHTML = `
      <div>
        <p class="text-sm text-gray-400">Score</p>
        <p class="font-bold">${game.player1_score} - ${game.player2_score}</p>
      </div>
      <div>
        <p class="text-sm text-gray-400">Status</p>
        <p class="font-bold">${game.status}</p>
      </div>
      <div>
        <p class="text-sm text-gray-400">Created</p>
        <p class="font-bold">${new Date(game.created_at).toLocaleDateString()}</p>
      </div>
    `;
    
    // Action button
    const actionButton = document.createElement('button');
    
    if (user && (game.player1_id === user.id || game.player2_id === user.id)) {
      actionButton.className = 'btn-primary w-full';
      
      // ゲームの状態に応じてボタンテキストを変更
      if (game.status === 'pending' || game.status === 'waiting') {
        actionButton.textContent = 'Start Game';
      } else if (game.status === 'paused') {
        actionButton.textContent = 'Resume Game';
      } else {
        actionButton.textContent = 'Join Game';
      }
    } else {
      actionButton.className = 'btn-outline w-full';
      actionButton.textContent = 'Watch Game';
    }
    
    actionButton.addEventListener('click', () => {
      window.location.href = `/game/${game.id}`;
    });
    
    // Assemble card
    content.appendChild(title);
    content.appendChild(players);
    content.appendChild(stats);
    content.appendChild(actionButton);
    
    card.appendChild(statusBadge);
    card.appendChild(content);
    
    return card;
  }
  
  function openNewGameModal() {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    
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
    modalTitle.textContent = 'Create New Game';
    
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
    
    // Opponent selector
    const opponentGroup = document.createElement('div');
    const opponentLabel = document.createElement('label');
    opponentLabel.className = 'block text-sm font-medium mb-2';
    opponentLabel.textContent = 'Select Opponent';
    
    const opponentSelect = document.createElement('select');
    opponentSelect.className = 'input w-full';
    opponentSelect.required = true;
    
    // Add loading option
    const loadingOption = document.createElement('option');
    loadingOption.value = '';
    loadingOption.textContent = 'Loading users...';
    loadingOption.disabled = true;
    loadingOption.selected = true;
    opponentSelect.appendChild(loadingOption);
    
    opponentGroup.appendChild(opponentLabel);
    opponentGroup.appendChild(opponentSelect);
    
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
    submitButton.textContent = 'Create Game';
    
    buttonsGroup.appendChild(cancelButton);
    buttonsGroup.appendChild(submitButton);
    
    // Assemble form
    form.appendChild(opponentGroup);
    form.appendChild(errorMessage);
    form.appendChild(buttonsGroup);
    
    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    
    // Add modal to document
    document.body.appendChild(modal);
    
    // Fetch users for opponent select
    fetchUsers(opponentSelect);
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const player2Id = opponentSelect.value;
      
      if (!player2Id) {
        errorMessage.textContent = 'Please select an opponent';
        errorMessage.classList.remove('hidden');
        return;
      }
      
      try {
        // Show loading state
        submitButton.textContent = 'Creating...';
        submitButton.disabled = true;
        errorMessage.classList.add('hidden');
        
        // Create game
        const response = await fetch('http://localhost:8000/api/games', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authContext.getToken()}`
          },
          body: JSON.stringify({ player2Id })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create game');
        }
        
        const data = await response.json();
        
        // Navigate to new game
        window.location.href = `/game/${data.game.id}`;
      } catch (error) {
        // Show error message
        errorMessage.textContent = error instanceof Error ? error.message : 'Failed to create game';
        errorMessage.classList.remove('hidden');
        
        // Reset button
        submitButton.textContent = 'Create Game';
        submitButton.disabled = false;
      }
    });
  }
  
  async function fetchUsers(selectElement: HTMLSelectElement) {
    try {
      const response = await fetch('http://localhost:8000/api/users', {
        headers: {
          'Authorization': `Bearer ${authContext.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      
      // Clear select
      selectElement.innerHTML = '';
      
      if (data.users && data.users.length > 0) {
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select an opponent';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        selectElement.appendChild(placeholderOption);
        
        // Filter out current user and add options
        data.users
          .filter((u: any) => u.id !== user?.id)
          .forEach((u: any) => {
            const option = document.createElement('option');
            option.value = String(u.id);
            option.textContent = u.username;
            selectElement.appendChild(option);
          });
      } else {
        const noUsersOption = document.createElement('option');
        noUsersOption.value = '';
        noUsersOption.textContent = 'No other users available';
        noUsersOption.disabled = true;
        selectElement.appendChild(noUsersOption);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Show error option
      selectElement.innerHTML = '';
      const errorOption = document.createElement('option');
      errorOption.value = '';
      errorOption.textContent = 'Failed to load users';
      errorOption.disabled = true;
      selectElement.appendChild(errorOption);
    }
  }
  
  return container;
}
