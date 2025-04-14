import { createAuthContext } from "../contexts/authContext";
import { getSocketInstance, on, emit } from "../services/socketService";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

let tournamentId: string | null = null;
let tournamentData: any = null;
let isAuthenticated = false;
let user: any = null;
let authContext: any;

export default function TournamentDetail() {
  authContext = createAuthContext();
  isAuthenticated = authContext.isAuthenticated();
  user = authContext.getUser();

  const container = document.createElement("div");
  container.className = "p-6 sm:p-10 container mx-auto max-w-6xl";

  const backButton = document.createElement("a");
  backButton.href = "/tournaments";
  backButton.className = "flex items-center text-primary mb-8 hover:underline";
  backButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
    </svg>
    Back to Tournaments
  `;
  container.appendChild(backButton);

  const titleArea = document.createElement("div");
  titleArea.className = "flex flex-col md:flex-row md:justify-between md:items-center mb-8";

  const titleSection = document.createElement("div");

  const title = document.createElement("h1");
  title.className = "text-3xl font-bold";
  title.textContent = "Tournament Details";

  const subtitle = document.createElement("p");
  subtitle.className = "text-gray-400 mt-1";
  subtitle.textContent = "Created by Unknown";

  titleSection.appendChild(title);
  titleSection.appendChild(subtitle);

  const statusBadge = document.createElement("span");
  statusBadge.className = "px-3 py-1 rounded-full text-sm bg-yellow-600 mt-4 md:mt-0";
  statusBadge.textContent = "Pending";

  titleArea.appendChild(titleSection);
  titleArea.appendChild(statusBadge);

  container.appendChild(titleArea);

  const contentContainer = document.createElement("div");
  contentContainer.className = "hidden";

  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "flex justify-center items-center my-12";
  loadingIndicator.innerHTML = `
    <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
  `;
  container.appendChild(loadingIndicator);

  const errorMessage = document.createElement("div");
  errorMessage.className = "bg-red-900/30 border border-red-700 p-4 rounded-lg text-center my-8 hidden";

  const errorText = document.createElement("p");
  errorText.className = "text-lg font-medium";
  errorText.textContent = "Error loading tournament";

  const retryButton = document.createElement("button");
  retryButton.className = "mt-3 px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg";
  retryButton.textContent = "Retry";

  errorMessage.appendChild(errorText);
  errorMessage.appendChild(retryButton);

  container.appendChild(errorMessage);

  const threeColumnLayout = document.createElement("div");
  threeColumnLayout.className = "grid grid-cols-1 lg:grid-cols-3 gap-6";

  const detailsCard = document.createElement("div");
  detailsCard.className = "bg-background p-6 rounded-lg";

  const detailsTitle = document.createElement("h2");
  detailsTitle.className = "text-xl font-bold mb-4";
  detailsTitle.textContent = "Tournament Details";

  const detailsList = document.createElement("div");
  detailsList.className = "space-y-4";

  detailsCard.appendChild(detailsTitle);
  detailsCard.appendChild(detailsList);

  const statsCard = document.createElement("div");
  statsCard.className = "bg-background p-6 rounded-lg";

  const statsTitle = document.createElement("h2");
  statsTitle.className = "text-xl font-bold mb-4";
  statsTitle.textContent = "Tournament Stats";

  const statsGrid = document.createElement("div");
  statsGrid.className = "grid grid-cols-2 gap-4";

  statsCard.appendChild(statsTitle);
  statsCard.appendChild(statsGrid);

  const actionsCard = document.createElement("div");
  actionsCard.className = "bg-background p-6 rounded-lg";

  const actionsTitle = document.createElement("h2");
  actionsTitle.className = "text-xl font-bold mb-4";
  actionsTitle.textContent = "Actions";

  const actionButtons = document.createElement("div");
  actionButtons.className = "space-y-4";

  actionsCard.appendChild(actionsTitle);
  actionsCard.appendChild(actionButtons);

  threeColumnLayout.appendChild(detailsCard);
  threeColumnLayout.appendChild(statsCard);
  threeColumnLayout.appendChild(actionsCard);

  contentContainer.appendChild(threeColumnLayout);

  const participantsSection = document.createElement("div");
  participantsSection.className = "bg-background p-6 rounded-lg mt-6";

  const participantsHeader = document.createElement("div");
  participantsHeader.className = "flex justify-between items-center mb-6";

  const participantsTitle = document.createElement("h2");
  participantsTitle.className = "text-xl font-bold";
  participantsTitle.textContent = "Participants";

  const participantsCount = document.createElement("span");
  participantsCount.className = "px-2 py-1 bg-background-dark rounded-full text-sm";
  participantsCount.textContent = "0/0";

  participantsHeader.appendChild(participantsTitle);
  participantsHeader.appendChild(participantsCount);

  const participantsList = document.createElement("div");
  participantsList.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
  participantsList.innerHTML = "<p class='text-center col-span-full py-6'>No participants yet</p>";

  participantsSection.appendChild(participantsHeader);
  participantsSection.appendChild(participantsList);

  contentContainer.appendChild(participantsSection);

  const bracketSection = document.createElement("div");
  bracketSection.className = "bg-background p-6 rounded-lg mt-6";

  const bracketTitle = document.createElement("h2");
  bracketTitle.className = "text-xl font-bold mb-6";
  bracketTitle.textContent = "Tournament Bracket";

  const bracketContainer = document.createElement("div");
  bracketContainer.className = "overflow-x-auto";
  bracketContainer.innerHTML = "<p class='text-center py-12'>Bracket information not available</p>";

  bracketSection.appendChild(bracketTitle);
  bracketSection.appendChild(bracketContainer);

  contentContainer.appendChild(bracketSection);

  container.appendChild(contentContainer);

  const url = window.location.pathname;
  const match = url.match(/\/tournament\/(\d+)/);

  if (match && match[1]) {
    tournamentId = match[1];
    loadTournamentData(match[1]);
  } else {
    showError("Tournament ID not provided");
  }

  async function loadTournamentData(id: string) {
    try {
      loadingIndicator.classList.remove("hidden");
      errorMessage.classList.add("hidden");
      contentContainer.classList.add("hidden");

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (isAuthenticated) {
        headers["Authorization"] = `Bearer ${authContext.getToken()}`;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendUrl}/api/tournaments/${id}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tournament data");
      }

      const data = await response.json();
      tournamentData = data.tournament;
      tournamentData.participants = data.participants || [];
      tournamentData.matches = data.matches || [];

      loadingIndicator.classList.add("hidden");
      contentContainer.classList.remove("hidden");

      updateTournamentUI(tournamentData);

      setupWebSocketListeners(id);
    } catch (error) {
      console.error("Error loading tournament data:", error);
      showError(error instanceof Error ? error.message : "Failed to load tournament");
    }
  }

  function updateTournamentUI(tournament: any) {
    title.textContent = tournament.name;
    subtitle.textContent = `Created by ${tournament.creator_name || "Unknown"}`;

    updateStatusBadge(tournament.status);

    updateDetailsList(tournament);

    updateStatsGrid(tournament);

    updateActionButtons(tournament);

    updateParticipantsList(tournament);

    updateBracketDisplay(tournament);
  }

  function updateStatusBadge(status: string) {
    statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");

    switch (status) {
      case "registration":
        statusBadge.className = "px-3 py-1 rounded-full text-sm bg-blue-600 mt-4 md:mt-0";
        break;
      case "in_progress":
        statusBadge.className = "px-3 py-1 rounded-full text-sm bg-green-600 mt-4 md:mt-0";
        break;
      case "completed":
        statusBadge.className = "px-3 py-1 rounded-full text-sm bg-gray-600 mt-4 md:mt-0";
        break;
      default:
        statusBadge.className = "px-3 py-1 rounded-full text-sm bg-yellow-600 mt-4 md:mt-0";
    }
  }

  function updateDetailsList(tournament: any) {
    detailsList.innerHTML = "";

    const formatDate = (dateString: any) => {
      if (!dateString) return "Not set";
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Not available";
        return date.toLocaleString();
      } catch (e) {
        return "Not available";
      }
    };

    const safeString = (value: any) => {
      if (value === undefined || value === null) return "Not available";
      return String(value);
    };

    const formatStatus = (status: string) => {
      if (!status) return "Not available";
      return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
    };

    const details = [
      {
        label: "Status",
        value: formatStatus(tournament.status),
      },
      { label: "Start Date", value: formatDate(tournament.start_date || tournament.startDate) },
      { label: "Created On", value: formatDate(tournament.created_at || tournament.createdAt) },
      { label: "Max Players", value: safeString(tournament.max_players || tournament.maxPlayers || 4) },
      { label: "Current Players", value: safeString((tournament.participants || []).length) },
    ];

    if (tournament.description) {
      details.push({ label: "Description", value: tournament.description });
    }

    details.forEach((detail) => {
      const item = document.createElement("div");

      const label = document.createElement("p");
      label.className = "text-sm text-gray-400";
      label.textContent = detail.label;

      const value = document.createElement("p");
      value.className = "font-medium";
      value.textContent = detail.value;

      item.appendChild(label);
      item.appendChild(value);

      detailsList.appendChild(item);
    });
  }

  function updateStatsGrid(tournament: any) {
    statsGrid.innerHTML = "";

    const participants = tournament.participants || [];
    const currentPlayers = participants.length;
    const maxPlayers = tournament.max_players || tournament.maxPlayers || 4;

    const registrationProgress = Math.round((currentPlayers / maxPlayers) * 100) || 0;
    const remainingSpots = maxPlayers - currentPlayers;
    const timeUntilStart = getTimeUntilStart(tournament.start_date || tournament.startDate);

    const stats = [
      { label: "Registration", value: `${registrationProgress}%` },
      { label: "Remaining Spots", value: String(remainingSpots) },
      { label: "Rounds", value: calculateRounds(maxPlayers) },
      { label: "Time Until Start", value: timeUntilStart },
    ];

    stats.forEach((stat) => {
      const item = document.createElement("div");
      item.className = "bg-background-dark rounded-lg p-4 text-center";

      const value = document.createElement("div");
      value.className = "text-xl font-bold mb-1";
      value.textContent = stat.value;

      const label = document.createElement("div");
      label.className = "text-sm text-gray-400";
      label.textContent = stat.label;

      item.appendChild(value);
      item.appendChild(label);

      statsGrid.appendChild(item);
    });

    const progressContainer = document.createElement("div");
    progressContainer.className = "col-span-2 mt-2";
    progressContainer.innerHTML = `
      <p class="text-sm text-gray-400 mb-1">Registration Progress</p>
      <div class="w-full bg-background-dark rounded-full h-2.5">
        <div class="bg-primary h-2.5 rounded-full" style="width: ${registrationProgress}%"></div>
      </div>
    `;

    statsGrid.appendChild(progressContainer);
  }

  function updateActionButtons(tournament: any) {
    actionButtons.innerHTML = "";

    const hasJoined =
      isAuthenticated && tournament.participants?.some((p: any) => p.user_id === user?.id || p.userId === user?.id);

    const isCreator =
      isAuthenticated &&
      (tournament.created_by === user?.id || tournament.createdBy === user?.id || tournament.creator_id === user?.id);

    if (tournament.status === "pending") {
      if (!hasJoined && !isCreator) {
        const joinButton = document.createElement("button");
        joinButton.className = "w-full py-2.5 bg-primary hover:bg-primary-dark rounded-lg font-medium";
        joinButton.textContent = "Join Tournament";
        joinButton.onclick = () => joinTournament(tournament.id);
        actionButtons.appendChild(joinButton);
      } else if (hasJoined && !isCreator) {
        const leaveButton = document.createElement("button");
        leaveButton.className = "w-full py-2.5 bg-red-700 hover:bg-red-800 rounded-lg font-medium";
        leaveButton.textContent = "Leave Tournament";
        leaveButton.onclick = () => leaveTournament(tournament.id);
        actionButtons.appendChild(leaveButton);
      }

      if (isCreator) {
        const startButton = document.createElement("button");
        startButton.className = "w-full py-2.5 bg-green-700 hover:bg-green-800 rounded-lg font-medium";
        startButton.textContent = "Start Tournament";
        startButton.onclick = () => startTournament(tournament.id);
        actionButtons.appendChild(startButton);
      } else {
        const infoMessage = document.createElement("div");
        infoMessage.className = "w-full py-2.5 bg-background-dark rounded-lg font-medium text-center";
        infoMessage.textContent = "Only creator can start";
        actionButtons.appendChild(infoMessage);
      }
    } else if (tournament.status === "in_progress") {
      const viewMatchesButton = document.createElement("button");
      viewMatchesButton.className = "w-full py-2.5 bg-blue-700 hover:bg-blue-800 rounded-lg font-medium";
      viewMatchesButton.textContent = "View Matches";
      viewMatchesButton.onclick = () => viewMatches(tournament.id);
      actionButtons.appendChild(viewMatchesButton);
    }
  }

  function updateParticipantsList(tournament: any) {
    participantsList.innerHTML = "";

    const participants = tournament.participants || [];
    participantsCount.textContent = `${participants.length}/${tournament.max_players || tournament.maxPlayers || 4}`;

    if (participants.length === 0) {
      participantsList.innerHTML = "<p class='text-center col-span-full py-6'>No participants yet</p>";
      return;
    }

    participants.forEach((participant: any) => {
      const participant_element = document.createElement("div");
      participant_element.className = "bg-background-dark rounded-lg p-3 flex items-center";

      const avatarPlaceholder = document.createElement("div");
      avatarPlaceholder.className =
        "w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-xl mr-3";

      const username = participant.username || participant.user?.username || "Unknown";
      avatarPlaceholder.textContent = username.charAt(0).toUpperCase();

      const nameElement = document.createElement("span");
      nameElement.textContent = username;

      participant_element.appendChild(avatarPlaceholder);
      participant_element.appendChild(nameElement);

      participantsList.appendChild(participant_element);
    });
  }

  function updateBracketDisplay(tournament: any) {
    bracketContainer.innerHTML = "";

    if (tournament.status !== "active" && tournament.status !== "in_progress" && tournament.status !== "completed") {
      bracketContainer.innerHTML = "<p class='text-center py-12'>ブラケット情報はまだ利用できません</p>";
      return;
    }

    const matches = tournament.matches || [];
    if (matches.length === 0) {
      bracketContainer.innerHTML = "<p class='text-center py-12'>マッチ情報が見つかりません</p>";
      return;
    }

    const matchesByRound: Record<number, any[]> = {};
    matches.forEach((match: any) => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    const bracketWrapper = document.createElement("div");
    bracketWrapper.className = "flex overflow-x-auto pb-4";

    const rounds = Object.keys(matchesByRound).sort((a, b) => Number(a) - Number(b));

    rounds.forEach((roundNum) => {
      const roundMatches = matchesByRound[Number(roundNum)];

      const roundColumn = document.createElement("div");
      roundColumn.className = "flex flex-col space-y-4 mx-4 min-w-[280px]";

      const roundTitle = document.createElement("h3");
      roundTitle.className = "text-lg font-bold mb-2 text-center";
      roundTitle.textContent =
        Number(roundNum) === 1
          ? "1回戦"
          : Number(roundNum) === 2
          ? "2回戦"
          : Number(roundNum) === 3
          ? "準決勝"
          : Number(roundNum) === 4
          ? "決勝"
          : `ラウンド ${roundNum}`;
      roundColumn.appendChild(roundTitle);

      roundMatches.forEach((match) => {
        const matchCard = createMatchCard(match);
        roundColumn.appendChild(matchCard);
      });

      bracketWrapper.appendChild(roundColumn);
    });

    bracketContainer.appendChild(bracketWrapper);
  }

  function showError(message: string) {
    loadingIndicator.classList.add("hidden");
    contentContainer.classList.add("hidden");
    errorMessage.classList.remove("hidden");
    errorText.textContent = message;
    retryButton.onclick = () => loadTournamentData(tournamentId!);
  }

  function createParticipantCard(participant: any) {
    const card = document.createElement("div");
    card.className = "bg-background-dark rounded-lg p-3 flex items-center";

    const avatarPlaceholder = document.createElement("div");
    avatarPlaceholder.className =
      "w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-xl mr-3";

    const username = participant.username || participant.user?.username || "Unknown";
    avatarPlaceholder.textContent = username.charAt(0).toUpperCase();

    const name = document.createElement("span");
    name.textContent = username;

    card.appendChild(avatarPlaceholder);
    card.appendChild(name);

    return card;
  }

  async function joinTournament(tournamentId: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendUrl}/api/tournaments/${tournamentId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authContext.getToken()}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to join tournament");
      }

      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join tournament");
    }
  }

  async function leaveTournament(tournamentId: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendUrl}/api/tournaments/${tournamentId}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authContext.getToken()}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to leave tournament");
      }

      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave tournament");
    }
  }

  async function startTournament(tournamentId: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    if (!confirm("Are you sure you want to start the tournament? This action cannot be undone.")) {
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendUrl}/api/tournaments/${tournamentId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authContext.getToken()}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start tournament");
      }

      loadTournamentData(tournamentId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to start tournament");
    }
  }

  function viewMatches(tournamentId: string) {
    bracketSection.scrollIntoView({ behavior: "smooth" });
  }

  function createMatchCard(match: any) {
    const matchCard = document.createElement("div");
    matchCard.className = "bg-background-dark rounded-lg p-4 flex flex-col";

    const statusBadge = document.createElement("div");
    statusBadge.className = `text-xs px-2 py-1 rounded-full mb-2 self-end ${
      match.status === "completed" ? "bg-green-700" : match.status === "in_progress" ? "bg-blue-700" : "bg-yellow-700"
    }`;
    statusBadge.textContent =
      match.status === "completed" ? "完了" : match.status === "in_progress" ? "進行中" : "予定";
    matchCard.appendChild(statusBadge);

    const player1 = document.createElement("div");
    player1.className = "flex items-center mb-2";

    const player1Avatar = document.createElement("div");
    player1Avatar.className = "w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-sm mr-2";
    player1Avatar.textContent = (match.player1_name || "?").charAt(0).toUpperCase();

    const player1Name = document.createElement("div");
    player1Name.className = "flex-1";
    player1Name.textContent = match.player1_name || "TBD";

    const player1Score = document.createElement("div");
    player1Score.className = "font-bold ml-2";
    player1Score.textContent = match.player1_score !== null ? String(match.player1_score) : "-";

    player1.appendChild(player1Avatar);
    player1.appendChild(player1Name);
    player1.appendChild(player1Score);

    const player2 = document.createElement("div");
    player2.className = "flex items-center";

    const player2Avatar = document.createElement("div");
    player2Avatar.className = "w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-sm mr-2";
    player2Avatar.textContent = (match.player2_name || "?").charAt(0).toUpperCase();

    const player2Name = document.createElement("div");
    player2Name.className = "flex-1";
    player2Name.textContent = match.player2_name || "TBD";

    const player2Score = document.createElement("div");
    player2Score.className = "font-bold ml-2";
    player2Score.textContent = match.player2_score !== null ? String(match.player2_score) : "-";

    player2.appendChild(player2Avatar);
    player2.appendChild(player2Name);
    player2.appendChild(player2Score);

    matchCard.appendChild(player1);
    matchCard.appendChild(player2);

    if (match.status === "pending") {
      const isCurrentUserPlaying = isAuthenticated && (user?.id === match.player1_id || user?.id === match.player2_id);

      if (isCurrentUserPlaying) {
        const actionButton = document.createElement("button");
        actionButton.className = "mt-3 w-full py-1 bg-primary hover:bg-primary-dark rounded-lg text-sm font-medium";
        actionButton.textContent = "ゲームをプレイ";
        actionButton.onclick = () => startGame(match.game_id);

        matchCard.appendChild(actionButton);
      }
    } else if (match.status === "completed") {
      const viewButton = document.createElement("button");
      viewButton.className = "mt-3 w-full py-1 bg-primary hover:bg-primary-dark rounded-lg text-sm font-medium";
      viewButton.textContent = "結果を見る";
      viewButton.onclick = () => viewGameResult(match.game_id);

      matchCard.appendChild(viewButton);
    }

    return matchCard;
  }

  function getTimeUntilStart(startDateStr: string): string {
    if (!startDateStr) return "Not set";

    try {
      const startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) return "Not available";

      const now = new Date();
      const diff = startDate.getTime() - now.getTime();

      if (diff <= 0) return "Started";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${days}d ${hours}h`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    } catch (e) {
      return "Not available";
    }
  }

  function calculateRounds(playerCount: number): string {
    const count = Number(playerCount) || 4;
    return String(Math.ceil(Math.log2(count)));
  }

  function startGame(gameId: number) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    window.location.href = `/game/${gameId}`;
  }

  function viewGameResult(gameId: number) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    window.location.href = `/game/${gameId}`;
  }

  function showToastNotification(message: string) {
    const toast = document.createElement("div");
    toast.className =
      "fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 z-50";
    toast.textContent = message;

    toast.style.transform = "translateY(-100px)";
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = "translateY(0)";
    }, 10);

    setTimeout(() => {
      toast.style.transform = "translateY(-100px)";
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 5000);
  }

  function setupWebSocketListeners(tournamentId: string) {
    const socket = getSocketInstance();
    if (!socket) {
      console.error("Socket connection not available");
      return;
    }

    socket.off(`tournament:updated`);
    socket.off(`game:updated`);
    socket.off(`tournament:started`);

    on(`tournament:started`, (data: any) => {
      console.log("Tournament started event received:", data);
      if (data && data.tournament && data.tournament.id === Number(tournamentId)) {
        console.log("Tournament started, updating UI");

        tournamentData = data.tournament;
        tournamentData.matches = data.matches || [];

        updateTournamentUI(tournamentData);

        showToastNotification("トーナメントが開始されました！");
      }
    });

    on(`tournament:updated`, (updatedTournament: any) => {
      console.log("Tournament updated event received:", updatedTournament);
      if (updatedTournament && updatedTournament.id === Number(tournamentId)) {
        console.log("Reloading tournament data after update");
        loadTournamentData(tournamentId);
      }
    });

    on(`game:updated`, (updatedGame: any) => {
      console.log("Game updated event received:", updatedGame);
      if (updatedGame && updatedGame.status === "completed") {
        console.log("Game completed, reloading tournament data");
        setTimeout(() => loadTournamentData(tournamentId), 1000);
      }
    });

    emit("join:room", `tournament:${tournamentId}`);
    console.log(`Joined tournament room: tournament:${tournamentId}`);
  }

  return container;
}
