import { createAuthContext } from "../contexts/authContext";

export default function Tournament(): HTMLElement {
  const authContext = createAuthContext();
  const user = authContext.getUser();
  const isAuthenticated = authContext.isAuthenticated();

  const container = document.createElement("div");
  container.className = "container mx-auto px-4 py-8";

  const pageHeader = document.createElement("div");
  pageHeader.className = "flex justify-between items-center mb-8";

  const pageTitle = document.createElement("h1");
  pageTitle.className = "text-2xl font-bold";
  pageTitle.textContent = "Tournaments";

  const newTournamentButton = document.createElement("button");
  newTournamentButton.className = "btn-primary";
  newTournamentButton.textContent = "Create Tournament";
  newTournamentButton.addEventListener("click", () => openNewTournamentModal());

  if (!isAuthenticated) {
    newTournamentButton.disabled = true;
    newTournamentButton.title = "Login to create a tournament";
    newTournamentButton.className = "btn-primary opacity-50 cursor-not-allowed";
  }

  pageHeader.appendChild(pageTitle);
  pageHeader.appendChild(newTournamentButton);

  const tournamentGrid = document.createElement("div");
  tournamentGrid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
  tournamentGrid.id = "tournament-grid";

  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "flex justify-center items-center py-12 col-span-full";
  loadingIndicator.innerHTML =
    '<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary"></div><p class="ml-3">Loading tournaments...</p>';
  tournamentGrid.appendChild(loadingIndicator);

  const noTournamentsMessage = document.createElement("div");
  noTournamentsMessage.className = "col-span-full text-center py-12 hidden";
  noTournamentsMessage.innerHTML = `
    <p class="text-xl text-gray-400 mb-4">No active tournaments found</p>
    <p class="mb-4">Be the first to create a new tournament!</p>
    <button class="btn-primary" id="no-tournaments-create-button">Create Tournament</button>
  `;

  if (!isAuthenticated) {
    noTournamentsMessage.innerHTML = `
      <p class="text-xl text-gray-400 mb-4">No active tournaments found</p>
      <p class="mb-4">Login to create a new tournament or join existing ones</p>
      <button class="btn-primary" id="no-tournaments-login-button">Login</button>
    `;
  }

  tournamentGrid.appendChild(noTournamentsMessage);

  container.appendChild(pageHeader);
  container.appendChild(tournamentGrid);

  fetchActiveTournaments();

  async function fetchActiveTournaments() {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (isAuthenticated) {
        headers["Authorization"] = `Bearer ${authContext.getToken()}`;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://localhost:8001";
      const response = await fetch(`${backendUrl}/api/tournaments`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tournaments");
      }

      const data = await response.json();

      loadingIndicator.remove();

      if (data.tournaments && data.tournaments.length > 0) {
        renderTournaments(data.tournaments);
      } else {
        noTournamentsMessage.classList.remove("hidden");

        const createButton = document.getElementById("no-tournaments-create-button");
        if (createButton) {
          createButton.addEventListener("click", () => openNewTournamentModal());
        }

        const loginButton = document.getElementById("no-tournaments-login-button");
        if (loginButton) {
          loginButton.addEventListener("click", () => {
            window.location.href = "/login";
          });
        }
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error);

      loadingIndicator.remove();

      const errorMessage = document.createElement("div");
      errorMessage.className = "col-span-full text-center py-12";
      errorMessage.innerHTML = `
        <p class="text-xl text-red-500 mb-4">Failed to load tournaments</p>
        <button class="btn-primary" id="retry-button">Retry</button>
      `;
      tournamentGrid.appendChild(errorMessage);

      const retryButton = document.getElementById("retry-button");
      if (retryButton) {
        retryButton.addEventListener("click", () => {
          errorMessage.remove();

          tournamentGrid.appendChild(loadingIndicator);

          fetchActiveTournaments();
        });
      }
    }
  }

  function renderTournaments(tournaments: any[]) {
    tournamentGrid.innerHTML = "";

    tournaments.forEach((tournament) => {
      const tournamentCard = createTournamentCard(tournament);
      tournamentGrid.appendChild(tournamentCard);
    });
  }

  function createTournamentCard(tournament: any) {
    const card = document.createElement("div");
    card.className = "card relative";

    const statusBadge = document.createElement("div");
    statusBadge.className = getStatusBadgeClass(tournament.status);
    statusBadge.textContent = tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1);

    const content = document.createElement("div");
    content.className = "mt-4";

    const title = document.createElement("h2");
    title.className = "text-lg font-bold mb-2";
    title.textContent = tournament.name;

    const info = document.createElement("div");
    info.className = "grid grid-cols-2 gap-4 mb-6";

    info.appendChild(createInfoItem("Status", tournament.status));
    info.appendChild(createInfoItem("Players", `${tournament.currentPlayers}/${tournament.maxPlayers}`));
    info.appendChild(createInfoItem("Starts", formatDate(tournament.startDate)));
    info.appendChild(createInfoItem("Created by", tournament.createdBy));

    if (tournament.status === "registration") {
      const progress = Math.round((tournament.currentPlayers / tournament.maxPlayers) * 100);

      const progressContainer = document.createElement("div");
      progressContainer.className = "col-span-2 mt-2";
      progressContainer.innerHTML = `
        <p class="text-sm text-gray-400 mb-1">Registration progress</p>
        <div class="w-full bg-background-dark rounded-full h-2.5">
          <div class="bg-primary h-2.5 rounded-full" style="width: ${progress}%"></div>
        </div>
      `;

      info.appendChild(progressContainer);
    }

    const actionButton = document.createElement("button");

    if (!isAuthenticated) {
      actionButton.className = "btn-outline w-full";
      actionButton.textContent = "Login to Join";
      actionButton.addEventListener("click", () => {
        window.location.href = "/login";
      });
    } else if (tournament.status === "registration") {
      if (tournament.participants?.includes(user?.id)) {
        actionButton.className = "btn-outline w-full";
        actionButton.textContent = "Leave Tournament";
        actionButton.addEventListener("click", () => leaveTournament(tournament.id));
      } else {
        actionButton.className = "btn-primary w-full";
        actionButton.textContent = "Join Tournament";
        actionButton.addEventListener("click", () => joinTournament(tournament.id));
      }
    } else if (tournament.status === "in_progress") {
      actionButton.className = "btn-primary w-full";
      actionButton.textContent = "View Tournament";
    } else if (tournament.status === "completed") {
      actionButton.className = "btn-outline w-full";
      actionButton.textContent = "View Results";
    } else {
      actionButton.className = "btn-outline w-full opacity-50 cursor-not-allowed";
      actionButton.textContent = "Not Available";
      actionButton.disabled = true;
    }

    if (tournament.status !== "registration" || !isAuthenticated) {
      actionButton.addEventListener("click", () => {
        window.location.href = `/tournament/${tournament.id}`;
      });
    }

    content.appendChild(title);
    content.appendChild(info);
    content.appendChild(actionButton);

    card.appendChild(statusBadge);
    card.appendChild(content);

    return card;
  }

  function createInfoItem(label: string, value: string) {
    const item = document.createElement("div");

    const labelElement = document.createElement("p");
    labelElement.className = "text-sm text-gray-400";
    labelElement.textContent = label;

    const valueElement = document.createElement("p");
    valueElement.className = "font-medium";
    valueElement.textContent = value;

    item.appendChild(labelElement);
    item.appendChild(valueElement);

    return item;
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case "registration":
        return "absolute top-3 right-3 px-2 py-1 rounded-full text-xs bg-blue-600";
      case "in_progress":
        return "absolute top-3 right-3 px-2 py-1 rounded-full text-xs bg-green-600";
      case "completed":
        return "absolute top-3 right-3 px-2 py-1 rounded-full text-xs bg-gray-600";
      default:
        return "absolute top-3 right-3 px-2 py-1 rounded-full text-xs bg-yellow-600";
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  async function joinTournament(tournamentId: number) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://localhost:8001";
      const response = await fetch(`${backendUrl}/api/tournaments/${tournamentId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authContext.getToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to join tournament");
      }

      tournamentGrid.innerHTML = "";
      tournamentGrid.appendChild(loadingIndicator);
      fetchActiveTournaments();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join tournament");
    }
  }

  async function leaveTournament(tournamentId: number) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://localhost:8001";
      const response = await fetch(`${backendUrl}/api/tournaments/${tournamentId}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authContext.getToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to leave tournament");
      }

      tournamentGrid.innerHTML = "";
      tournamentGrid.appendChild(loadingIndicator);
      fetchActiveTournaments();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave tournament");
    }
  }

  function openNewTournamentModal() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    const modal = document.createElement("div");
    modal.className = "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    const modalContent = document.createElement("div");
    modalContent.className = "bg-background-light p-6 rounded-lg max-w-md w-full";

    const modalHeader = document.createElement("div");
    modalHeader.className = "flex justify-between items-center mb-4";

    const modalTitle = document.createElement("h2");
    modalTitle.className = "text-xl font-bold";
    modalTitle.textContent = "Create New Tournament";

    const closeButton = document.createElement("button");
    closeButton.className = "text-gray-400 hover:text-white";
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", () => {
      modal.remove();
    });

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    const form = document.createElement("form");
    form.className = "space-y-4";

    const nameGroup = document.createElement("div");

    const nameLabel = document.createElement("label");
    nameLabel.className = "block text-sm font-medium mb-2";
    nameLabel.textContent = "Tournament Name";

    const nameInput = document.createElement("input");
    nameInput.className = "input w-full";
    nameInput.type = "text";
    nameInput.required = true;

    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);

    const playersGroup = document.createElement("div");

    const playersLabel = document.createElement("label");
    playersLabel.className = "block text-sm font-medium mb-2";
    playersLabel.textContent = "Number of Players";

    const playersSelect = document.createElement("select");
    playersSelect.className = "input w-full";
    playersSelect.required = true;

    [4, 8, 16, 32].forEach((num) => {
      const option = document.createElement("option");
      option.value = String(num);
      option.textContent = String(num);
      playersSelect.appendChild(option);
    });

    playersGroup.appendChild(playersLabel);
    playersGroup.appendChild(playersSelect);

    const dateGroup = document.createElement("div");

    const dateLabel = document.createElement("label");
    dateLabel.className = "block text-sm font-medium mb-2";
    dateLabel.textContent = "Start Date";

    const dateInput = document.createElement("input");
    dateInput.className = "input w-full";
    dateInput.type = "datetime-local";
    dateInput.required = true;

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dateInput.min = now.toISOString().slice(0, 16);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    dateInput.value = tomorrow.toISOString().slice(0, 16);

    dateGroup.appendChild(dateLabel);
    dateGroup.appendChild(dateInput);

    const descriptionGroup = document.createElement("div");

    const descriptionLabel = document.createElement("label");
    descriptionLabel.className = "block text-sm font-medium mb-2";
    descriptionLabel.textContent = "Description (optional)";

    const descriptionInput = document.createElement("textarea");
    descriptionInput.className = "input w-full";
    descriptionInput.rows = 3;

    descriptionGroup.appendChild(descriptionLabel);
    descriptionGroup.appendChild(descriptionInput);

    const errorMessage = document.createElement("div");
    errorMessage.className = "text-red-500 text-sm hidden";

    const buttonsGroup = document.createElement("div");
    buttonsGroup.className = "flex justify-end space-x-2";

    const cancelButton = document.createElement("button");
    cancelButton.className = "btn-outline";
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      modal.remove();
    });

    const submitButton = document.createElement("button");
    submitButton.className = "btn-primary";
    submitButton.type = "submit";
    submitButton.textContent = "Create Tournament";

    buttonsGroup.appendChild(cancelButton);
    buttonsGroup.appendChild(submitButton);

    form.appendChild(nameGroup);
    form.appendChild(playersGroup);
    form.appendChild(dateGroup);
    form.appendChild(descriptionGroup);
    form.appendChild(errorMessage);
    form.appendChild(buttonsGroup);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      const maxPlayers = parseInt(playersSelect.value);
      const startDate = new Date(dateInput.value).toISOString();
      const description = descriptionInput.value.trim();

      if (!name) {
        errorMessage.textContent = "Tournament name is required";
        errorMessage.classList.remove("hidden");
        return;
      }

      try {
        submitButton.textContent = "Creating...";
        submitButton.disabled = true;
        errorMessage.classList.add("hidden");

        const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://localhost:8001";
        const response = await fetch(`${backendUrl}/api/tournaments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authContext.getToken()}`,
          },
          body: JSON.stringify({
            name,
            maxPlayers,
            startDate,
            description: description || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create tournament");
        }

        modal.remove();
        tournamentGrid.innerHTML = "";
        tournamentGrid.appendChild(loadingIndicator);
        fetchActiveTournaments();
      } catch (error) {
        errorMessage.textContent = error instanceof Error ? error.message : "Failed to create tournament";
        errorMessage.classList.remove("hidden");

        submitButton.textContent = "Create Tournament";
        submitButton.disabled = false;
      }
    });
  }

  return container;
}
