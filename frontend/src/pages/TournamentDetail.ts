import { createAuthContext } from '../contexts/authContext';

export default function TournamentDetail(): HTMLElement {
  // Get auth context
  const authContext = createAuthContext();
  const user = authContext.getUser();
  const isAuthenticated = authContext.isAuthenticated();
  
  // Tournament data
  let tournamentId: string | null = null;
  let tournamentData: any = null;
  
  // Create container
  const container = document.createElement('div');
  container.className = 'container mx-auto px-4 py-8';
  
  // Back button
  const backButton = document.createElement('a');
  backButton.href = '/tournaments';
  backButton.className = 'inline-flex items-center text-primary hover:text-primary-dark mb-6';
  backButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
    </svg>
    Back to Tournaments
  `;
  container.appendChild(backButton);
  
  // Header section
  const header = document.createElement('div');
  header.className = 'flex flex-col md:flex-row justify-between items-start md:items-center mb-6';
  
  const titleArea = document.createElement('div');
  
  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold mb-2';
  title.textContent = 'Tournament Details';
  
  const subtitle = document.createElement('p');
  subtitle.className = 'text-gray-400';
  subtitle.textContent = 'Loading tournament information...';
  
  titleArea.appendChild(title);
  titleArea.appendChild(subtitle);
  
  const statusBadge = document.createElement('div');
  statusBadge.className = 'px-3 py-1 rounded-full text-sm bg-yellow-600 mt-4 md:mt-0';
  statusBadge.textContent = 'Loading...';
  
  header.appendChild(titleArea);
  header.appendChild(statusBadge);
  
  container.appendChild(header);
  
  // Loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'flex justify-center items-center py-12';
  loadingIndicator.innerHTML = '<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary"></div><p class="ml-3">Loading tournament details...</p>';
  container.appendChild(loadingIndicator);
  
  // Error message
  const errorMessage = document.createElement('div');
  errorMessage.className = 'text-center py-12 hidden';
  errorMessage.innerHTML = `
    <p class="text-xl text-red-500 mb-4">Failed to load tournament</p>
    <button class="btn-primary" id="retry-button">Retry</button>
  `;
  container.appendChild(errorMessage);
  
  // Content container (hidden initially)
  const contentContainer = document.createElement('div');
  contentContainer.className = 'hidden';
  
  // Tournament info section
  const infoSection = document.createElement('div');
  infoSection.className = 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8';
  
  // Tournament details card
  const detailsCard = document.createElement('div');
  detailsCard.className = 'card';
  
  const detailsTitle = document.createElement('h2');
  detailsTitle.className = 'text-xl font-bold mb-4';
  detailsTitle.textContent = 'Tournament Details';
  
  const detailsList = document.createElement('div');
  detailsList.className = 'space-y-4';
  
  detailsCard.appendChild(detailsTitle);
  detailsCard.appendChild(detailsList);
  
  // Tournament stats card
  const statsCard = document.createElement('div');
  statsCard.className = 'card';
  
  const statsTitle = document.createElement('h2');
  statsTitle.className = 'text-xl font-bold mb-4';
  statsTitle.textContent = 'Tournament Stats';
  
  const statsGrid = document.createElement('div');
  statsGrid.className = 'grid grid-cols-2 gap-4';
  
  statsCard.appendChild(statsTitle);
  statsCard.appendChild(statsGrid);
  
  // Action card
  const actionCard = document.createElement('div');
  actionCard.className = 'card';
  
  const actionTitle = document.createElement('h2');
  actionTitle.className = 'text-xl font-bold mb-4';
  actionTitle.textContent = 'Actions';
  
  const actionButtons = document.createElement('div');
  actionButtons.className = 'space-y-3';
  
  const joinLeaveButton = document.createElement('button');
  joinLeaveButton.className = 'btn-primary w-full';
  joinLeaveButton.textContent = 'Join Tournament';
  joinLeaveButton.id = 'join-leave-button';
  
  const startButton = document.createElement('button');
  startButton.className = 'btn-outline w-full';
  startButton.textContent = 'Start Tournament';
  startButton.id = 'start-button';
  startButton.disabled = true;
  
  actionButtons.appendChild(joinLeaveButton);
  actionButtons.appendChild(startButton);
  actionCard.appendChild(actionTitle);
  actionCard.appendChild(actionButtons);
  
  // Add cards to info section
  infoSection.appendChild(detailsCard);
  infoSection.appendChild(statsCard);
  infoSection.appendChild(actionCard);
  
  // Add info section to content container
  contentContainer.appendChild(infoSection);
  
  // Participants section
  const participantsSection = document.createElement('div');
  participantsSection.className = 'card mb-8';
  
  const participantsHeader = document.createElement('div');
  participantsHeader.className = 'flex justify-between items-center mb-4';
  
  const participantsTitle = document.createElement('h2');
  participantsTitle.className = 'text-xl font-bold';
  participantsTitle.textContent = 'Participants';
  
  const participantsCount = document.createElement('div');
  participantsCount.className = 'px-3 py-1 rounded-full text-sm bg-background-dark';
  participantsCount.textContent = '0/0';
  participantsCount.id = 'participants-count';
  
  participantsHeader.appendChild(participantsTitle);
  participantsHeader.appendChild(participantsCount);
  
  const participantsList = document.createElement('div');
  participantsList.className = 'grid grid-cols-2 md:grid-cols-4 gap-4';
  participantsList.id = 'participants-list';
  
  participantsSection.appendChild(participantsHeader);
  participantsSection.appendChild(participantsList);
  
  // Add participants section to content container
  contentContainer.appendChild(participantsSection);
  
  // Tournament bracket section
  const bracketSection = document.createElement('div');
  bracketSection.className = 'card';
  
  const bracketTitle = document.createElement('h2');
  bracketTitle.className = 'text-xl font-bold mb-6';
  bracketTitle.textContent = 'Tournament Bracket';
  
  const bracketContainer = document.createElement('div');
  bracketContainer.className = 'overflow-x-auto';
  bracketContainer.id = 'bracket-container';
  
  bracketSection.appendChild(bracketTitle);
  bracketSection.appendChild(bracketContainer);
  
  // Add bracket section to content container
  contentContainer.appendChild(bracketSection);
  
  // Add content container to main container
  container.appendChild(contentContainer);
  
  // Get route params from window
  const params = (window as any).__ROUTE_PARAMS__ || {};
  if (params.id) {
    tournamentId = params.id;
    loadTournamentData(params.id);
  } else {
    showError('Tournament ID not provided');
  }
  
  // Functions
  async function loadTournamentData(id: string) {
    try {
      // Show loading indicator
      loadingIndicator.classList.remove('hidden');
      errorMessage.classList.add('hidden');
      contentContainer.classList.add('hidden');
      
      // Build headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (isAuthenticated) {
        headers['Authorization'] = `Bearer ${authContext.getToken()}`;
      }
      
      // Fetch tournament data
      const response = await fetch(`http://localhost:8000/api/tournaments/${id}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tournament data');
      }
      
      const data = await response.json();
      tournamentData = data.tournament;
      
      // Hide loading indicator and show content
      loadingIndicator.classList.add('hidden');
      contentContainer.classList.remove('hidden');
      
      // Update UI with tournament data
      updateTournamentUI(tournamentData);
    } catch (error) {
      console.error('Error loading tournament data:', error);
      showError(error instanceof Error ? error.message : 'Failed to load tournament');
    }
  }
  
  function updateTournamentUI(tournament: any) {
    // Update title and subtitle
    title.textContent = tournament.name;
    subtitle.textContent = `Created by ${tournament.createdBy}`;
    
    // Update status badge
    updateStatusBadge(tournament.status);
    
    // Update details list
    updateDetailsList(tournament);
    
    // Update stats grid
    updateStatsGrid(tournament);
    
    // Update action buttons
    updateActionButtons(tournament);
    
    // Update participants list
    updateParticipantsList(tournament);
    
    // Update bracket display
    updateBracketDisplay(tournament);
  }
  
  function updateStatusBadge(status: string) {
    statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    
    switch (status) {
      case 'registration':
        statusBadge.className = 'px-3 py-1 rounded-full text-sm bg-blue-600 mt-4 md:mt-0';
        break;
      case 'in_progress':
        statusBadge.className = 'px-3 py-1 rounded-full text-sm bg-green-600 mt-4 md:mt-0';
        break;
      case 'completed':
        statusBadge.className = 'px-3 py-1 rounded-full text-sm bg-gray-600 mt-4 md:mt-0';
        break;
      default:
        statusBadge.className = 'px-3 py-1 rounded-full text-sm bg-yellow-600 mt-4 md:mt-0';
    }
  }
  
  function updateDetailsList(tournament: any) {
    // Clear existing details
    detailsList.innerHTML = '';
    
    // Add tournament details
    const details = [
      { label: 'Status', value: tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1).replace('_', ' ') },
      { label: 'Start Date', value: new Date(tournament.startDate).toLocaleString() },
      { label: 'Created On', value: new Date(tournament.createdAt).toLocaleString() },
      { label: 'Max Players', value: String(tournament.maxPlayers) },
      { label: 'Current Players', value: String(tournament.currentPlayers) }
    ];
    
    if (tournament.description) {
      details.push({ label: 'Description', value: tournament.description });
    }
    
    details.forEach(detail => {
      const item = document.createElement('div');
      
      const label = document.createElement('p');
      label.className = 'text-sm text-gray-400';
      label.textContent = detail.label;
      
      const value = document.createElement('p');
      value.className = 'font-medium';
      value.textContent = detail.value;
      
      item.appendChild(label);
      item.appendChild(value);
      
      detailsList.appendChild(item);
    });
  }
  
  function updateStatsGrid(tournament: any) {
    // Clear existing stats
    statsGrid.innerHTML = '';
    
    // Calculate stats
    const registrationProgress = Math.round((tournament.currentPlayers / tournament.maxPlayers) * 100);
    const remainingSpots = tournament.maxPlayers - tournament.currentPlayers;
    const timeUntilStart = getTimeUntilStart(tournament.startDate);
    
    // Add stats
    const stats = [
      { label: 'Registration', value: `${registrationProgress}%` },
      { label: 'Remaining Spots', value: String(remainingSpots) },
      { label: 'Rounds', value: calculateRounds(tournament.maxPlayers) },
      { label: 'Time Until Start', value: timeUntilStart }
    ];
    
    stats.forEach(stat => {
      const item = document.createElement('div');
      item.className = 'bg-background-dark rounded-lg p-4 text-center';
      
      const value = document.createElement('div');
      value.className = 'text-xl font-bold mb-1';
      value.textContent = stat.value;
      
      const label = document.createElement('div');
      label.className = 'text-sm text-gray-400';
      label.textContent = stat.label;
      
      item.appendChild(value);
      item.appendChild(label);
      
      statsGrid.appendChild(item);
    });
    
    // Add registration progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'col-span-2 mt-2';
    progressContainer.innerHTML = `
      <p class="text-sm text-gray-400 mb-1">Registration Progress</p>
      <div class="w-full bg-background-dark rounded-full h-2.5">
        <div class="bg-primary h-2.5 rounded-full" style="width: ${registrationProgress}%"></div>
      </div>
    `;
    
    statsGrid.appendChild(progressContainer);
  }
  
  function updateActionButtons(tournament: any) {
    const joinLeaveButton = document.getElementById('join-leave-button') as HTMLButtonElement;
    const startButton = document.getElementById('start-button') as HTMLButtonElement;
    
    if (!joinLeaveButton || !startButton) return;
    
    // Disable buttons if not authenticated
    if (!isAuthenticated) {
      joinLeaveButton.textContent = 'Login to Join';
      joinLeaveButton.className = 'btn-primary w-full';
      joinLeaveButton.onclick = () => { window.location.href = '/login'; };
      
      startButton.disabled = true;
      startButton.className = 'btn-outline w-full opacity-50 cursor-not-allowed';
      return;
    }
    
    // Set join/leave button state
    const isParticipant = tournament.participants?.some((p: any) => p.id === user?.id);
    
    if (tournament.status === 'registration') {
      if (isParticipant) {
        joinLeaveButton.textContent = 'Leave Tournament';
        joinLeaveButton.className = 'btn-outline w-full';
        joinLeaveButton.onclick = () => leaveTournament(tournament.id);
      } else if (tournament.currentPlayers < tournament.maxPlayers) {
        joinLeaveButton.textContent = 'Join Tournament';
        joinLeaveButton.className = 'btn-primary w-full';
        joinLeaveButton.onclick = () => joinTournament(tournament.id);
      } else {
        joinLeaveButton.textContent = 'Tournament Full';
        joinLeaveButton.className = 'btn-outline w-full opacity-50 cursor-not-allowed';
        joinLeaveButton.disabled = true;
      }
    } else {
      joinLeaveButton.textContent = isParticipant ? 'You are Participating' : 'Registration Closed';
      joinLeaveButton.className = 'btn-outline w-full opacity-50 cursor-not-allowed';
      joinLeaveButton.disabled = true;
    }
    
    // Set start button state
    if (tournament.createdBy === user?.username && tournament.status === 'registration' && tournament.currentPlayers >= 4) {
      startButton.textContent = 'Start Tournament';
      startButton.className = 'btn-primary w-full';
      startButton.disabled = false;
      startButton.onclick = () => startTournament(tournament.id);
    } else if (tournament.createdBy === user?.username && tournament.status === 'registration') {
      startButton.textContent = 'Need at least 4 players';
      startButton.className = 'btn-outline w-full opacity-50 cursor-not-allowed';
      startButton.disabled = true;
    } else {
      startButton.textContent = 'Only creator can start';
      startButton.className = 'btn-outline w-full opacity-50 cursor-not-allowed';
      startButton.disabled = true;
    }
  }
  
  function updateParticipantsList(tournament: any) {
    // Update participants count
    const participantsCount = document.getElementById('participants-count');
    if (participantsCount) {
      participantsCount.textContent = `${tournament.currentPlayers}/${tournament.maxPlayers}`;
    }
    
    // Clear existing participants
    const participantsList = document.getElementById('participants-list');
    if (!participantsList) return;
    
    participantsList.innerHTML = '';
    
    // Add participants
    if (tournament.participants && tournament.participants.length > 0) {
      tournament.participants.forEach((participant: any) => {
        const card = document.createElement('div');
        card.className = 'bg-background-dark rounded-lg p-3 flex items-center';
        
        const avatar = document.createElement('div');
        avatar.className = 'w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3';
        avatar.textContent = participant.username.charAt(0).toUpperCase();
        
        const name = document.createElement('div');
        name.className = 'font-medium text-sm truncate';
        name.textContent = participant.username;
        
        card.appendChild(avatar);
        card.appendChild(name);
        
        participantsList.appendChild(card);
      });
    } else {
      const message = document.createElement('div');
      message.className = 'col-span-4 text-center py-4 text-gray-400';
      message.textContent = 'No participants yet';
      
      participantsList.appendChild(message);
    }
  }
  
  function updateBracketDisplay(tournament: any) {
    const bracketContainer = document.getElementById('bracket-container');
    if (!bracketContainer) return;
    
    bracketContainer.innerHTML = '';
    
    if (tournament.status === 'registration') {
      const message = document.createElement('div');
      message.className = 'text-center py-8 text-gray-400';
      message.textContent = 'Tournament bracket will be available once the tournament starts';
      
      bracketContainer.appendChild(message);
      return;
    }
    
    if (!tournament.bracket || !tournament.bracket.rounds || tournament.bracket.rounds.length === 0) {
      const message = document.createElement('div');
      message.className = 'text-center py-8 text-gray-400';
      message.textContent = 'Bracket information not available';
      
      bracketContainer.appendChild(message);
      return;
    }
    
    // Create bracket visualization
    const bracket = document.createElement('div');
    bracket.className = 'flex space-x-8 py-4 px-2 min-w-max';
    
    tournament.bracket.rounds.forEach((round: any, roundIndex: number) => {
      const roundColumn = document.createElement('div');
      roundColumn.className = 'flex flex-col space-y-8';
      
      const roundTitle = document.createElement('div');
      roundTitle.className = 'text-center font-bold mb-4';
      roundTitle.textContent = `Round ${roundIndex + 1}`;
      
      roundColumn.appendChild(roundTitle);
      
      // Calculate spacing based on round
      const roundSpacing = Math.pow(2, roundIndex) * 40;
      
      round.matches.forEach((match: any, matchIndex: number) => {
        const matchCard = createMatchCard(match, roundIndex === tournament.bracket.rounds.length - 1);
        
        if (roundIndex > 0) {
          // Add appropriate spacing for visualization
          const spacer = document.createElement('div');
          spacer.style.height = `${roundSpacing}px`;
          
          if (matchIndex % 2 === 0) {
            roundColumn.appendChild(matchCard);
            roundColumn.appendChild(spacer);
          } else {
            roundColumn.appendChild(spacer);
            roundColumn.appendChild(matchCard);
          }
        } else {
          roundColumn.appendChild(matchCard);
        }
      });
      
      bracket.appendChild(roundColumn);
    });
    
    bracketContainer.appendChild(bracket);
  }
  
  function createMatchCard(match: any, isFinal: boolean) {
    const card = document.createElement('div');
    card.className = `bg-background-dark rounded-lg p-3 ${isFinal ? 'border-2 border-yellow-500' : ''}`;
    card.style.width = '200px';
    
    const header = document.createElement('div');
    header.className = 'text-xs text-gray-400 mb-2';
    header.textContent = match.id ? `Match #${match.id}` : 'TBD';
    
    const player1 = document.createElement('div');
    player1.className = `flex justify-between items-center p-2 rounded ${match.winner === match.player1?.id ? 'bg-green-900' : ''}`;
    
    const player1Name = document.createElement('div');
    player1Name.className = 'font-medium truncate';
    player1Name.textContent = match.player1?.username || 'TBD';
    
    const player1Score = document.createElement('div');
    player1Score.className = 'font-bold';
    player1Score.textContent = match.player1Score !== undefined ? String(match.player1Score) : '-';
    
    player1.appendChild(player1Name);
    player1.appendChild(player1Score);
    
    const vs = document.createElement('div');
    vs.className = 'text-xs text-center my-1 text-gray-400';
    vs.textContent = 'VS';
    
    const player2 = document.createElement('div');
    player2.className = `flex justify-between items-center p-2 rounded ${match.winner === match.player2?.id ? 'bg-green-900' : ''}`;
    
    const player2Name = document.createElement('div');
    player2Name.className = 'font-medium truncate';
    player2Name.textContent = match.player2?.username || 'TBD';
    
    const player2Score = document.createElement('div');
    player2Score.className = 'font-bold';
    player2Score.textContent = match.player2Score !== undefined ? String(match.player2Score) : '-';
    
    player2.appendChild(player2Name);
    player2.appendChild(player2Score);
    
    const status = document.createElement('div');
    status.className = 'text-xs text-center mt-2';
    
    if (match.status === 'completed') {
      status.className += ' text-green-500';
      status.textContent = 'Completed';
    } else if (match.status === 'in_progress') {
      status.className += ' text-yellow-500';
      status.textContent = 'In Progress';
    } else {
      status.className += ' text-gray-400';
      status.textContent = 'Pending';
    }
    
    card.appendChild(header);
    card.appendChild(player1);
    card.appendChild(vs);
    card.appendChild(player2);
    card.appendChild(status);
    
    if (match.status === 'in_progress') {
      const watchButton = document.createElement('button');
      watchButton.className = 'btn-primary w-full mt-2 text-xs py-1';
      watchButton.textContent = 'Watch Game';
      watchButton.onclick = () => {
        if (match.gameId) {
          window.location.href = `/game/${match.gameId}`;
        }
      };
      
      card.appendChild(watchButton);
    }
    
    return card;
  }
  
  async function joinTournament(tournamentId: string) {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authContext.getToken()}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join tournament');
      }
      
      // Reload tournament data
      loadTournamentData(tournamentId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to join tournament');
    }
  }
  
  async function leaveTournament(tournamentId: string) {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/tournaments/${tournamentId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authContext.getToken()}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave tournament');
      }
      
      // Reload tournament data
      loadTournamentData(tournamentId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to leave tournament');
    }
  }
  
  async function startTournament(tournamentId: string) {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    
    if (confirm('Are you sure you want to start the tournament? This action cannot be undone.')) {
      try {
        const response = await fetch(`http://localhost:8000/api/tournaments/${tournamentId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authContext.getToken()}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start tournament');
        }
        
        // Reload tournament data
        loadTournamentData(tournamentId);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to start tournament');
      }
    }
  }
  
  function showError(message: string) {
    // Hide loading indicator and content
    loadingIndicator.classList.add('hidden');
    contentContainer.classList.add('hidden');
    
    // Update and show error message
    const errorText = errorMessage.querySelector('p');
    if (errorText) {
      errorText.textContent = message;
    }
    
    errorMessage.classList.remove('hidden');
    
    // Add retry button functionality
    const retryButton = document.getElementById('retry-button');
    if (retryButton && tournamentId) {
      retryButton.onclick = () => loadTournamentData(tournamentId);
    }
  }
  
  function getTimeUntilStart(startDate: string): string {
    const start = new Date(startDate);
    const now = new Date();
    
    if (now > start) {
      return 'Started';
    }
    
    const diff = start.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  }
  
  function calculateRounds(players: number): string {
    return String(Math.ceil(Math.log2(players)));
  }
  
  return container;
}
