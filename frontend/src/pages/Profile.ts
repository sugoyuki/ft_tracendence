import { createAuthContext } from "../contexts/authContext";

export default function Profile(): HTMLElement {
  const authContext = createAuthContext();
  const user = authContext.getUser();

  const container = document.createElement("div");
  container.className = "container mx-auto px-4 py-8";

  const pageHeader = document.createElement("div");
  pageHeader.className = "mb-8";

  const pageTitle = document.createElement("h1");
  pageTitle.className = "text-2xl font-bold";
  pageTitle.textContent = "My Profile";

  pageHeader.appendChild(pageTitle);

  const profileContent = document.createElement("div");
  profileContent.className = "grid grid-cols-1 lg:grid-cols-3 gap-8";

  const profileCard = document.createElement("div");
  profileCard.className = "card";

  const avatarSection = document.createElement("div");
  avatarSection.className = "flex flex-col items-center justify-center mb-6";

  const avatar = document.createElement("div");
  avatar.className =
    "w-24 h-24 rounded-full bg-primary flex items-center justify-center text-3xl font-bold mb-4 overflow-hidden";

  if (user?.avatar) {
    const img = document.createElement("img");
    img.src = user.avatar;
    img.alt = user?.username || "User avatar";
    img.className = "w-full h-full object-cover";
    img.onerror = () => {
      img.remove();
      avatar.textContent = user?.username.charAt(0).toUpperCase() || "U";
    };
    avatar.textContent = "";
    avatar.appendChild(img);
  } else {
    avatar.textContent = user?.username.charAt(0).toUpperCase() || "U";
  }

  const username = document.createElement("h2");
  username.className = "text-xl font-bold text-center";
  username.textContent = user?.username || "Username";

  const email = document.createElement("p");
  email.className = "text-gray-400 text-center";
  email.textContent = user?.email || "email@example.com";

  avatarSection.appendChild(avatar);
  avatarSection.appendChild(username);
  avatarSection.appendChild(email);

  const editButton = document.createElement("button");
  editButton.className = "btn-outline w-full mt-4";
  editButton.textContent = "Edit Profile";
  editButton.addEventListener("click", openEditProfileModal);

  const lastLoginInfo = document.createElement("div");
  lastLoginInfo.className = "mt-6 pt-6 border-t border-gray-700";
  lastLoginInfo.innerHTML = `
    <p class="text-sm text-gray-400">Member since</p>
    <p>${new Date().toLocaleDateString()}</p>
  `;

  profileCard.appendChild(avatarSection);
  profileCard.appendChild(editButton);
  profileCard.appendChild(lastLoginInfo);

  const friendsCard = document.createElement("div");
  friendsCard.className = "card";

  const friendsHeader = document.createElement("div");
  friendsHeader.className = "flex justify-between items-center mb-4";

  const friendsTitle = document.createElement("h2");
  friendsTitle.className = "text-xl font-bold";
  friendsTitle.textContent = "Friends";

  const addFriendButton = document.createElement("button");
  addFriendButton.className = "btn-outline btn-sm";
  addFriendButton.textContent = "Add Friend";
  addFriendButton.addEventListener("click", openAddFriendModal);

  friendsHeader.appendChild(friendsTitle);
  friendsHeader.appendChild(addFriendButton);

  const friendsList = document.createElement("div");
  friendsList.className = "space-y-2 max-h-80 overflow-y-auto";
  friendsList.innerHTML = `<div class="text-center text-gray-400 py-2">Loading friends...</div>`;

  const pendingRequestsList = document.createElement("div");
  pendingRequestsList.className = "mt-4 pt-4 border-t border-gray-700 space-y-2";
  pendingRequestsList.innerHTML = ``;

  friendsCard.appendChild(friendsHeader);
  friendsCard.appendChild(friendsList);
  friendsCard.appendChild(pendingRequestsList);

  const statsCard = document.createElement("div");
  statsCard.className = "card lg:col-span-2";

  const statsHeader = document.createElement("div");
  statsHeader.className = "flex justify-between items-center mb-4";

  const statsTitle = document.createElement("h2");
  statsTitle.className = "text-xl font-bold";
  statsTitle.textContent = "Game Statistics";

  statsHeader.appendChild(statsTitle);

  const statsContent = document.createElement("div");
  statsContent.className = "grid grid-cols-2 sm:grid-cols-4 gap-4";

  const statItems = [
    { id: "games-played", label: "Games Played", value: "0" },
    { id: "wins", label: "Wins", value: "0" },
    { id: "losses", label: "Losses", value: "0" },
    { id: "win-rate", label: "Win Rate", value: "0%" },
  ];

  statItems.forEach((item) => {
    const statBox = document.createElement("div");
    statBox.className = "bg-background-dark rounded-lg p-4 text-center";

    const statValue = document.createElement("div");
    statValue.className = "text-2xl font-bold mb-1";
    statValue.id = item.id; // 統計要素に一意のIDを設定
    statValue.textContent = item.value;

    const statLabel = document.createElement("div");
    statLabel.className = "text-sm text-gray-400";
    statLabel.textContent = item.label;

    statBox.appendChild(statValue);
    statBox.appendChild(statLabel);

    statsContent.appendChild(statBox);
  });

  statsCard.appendChild(statsHeader);
  statsCard.appendChild(statsContent);

  const gameHistorySection = document.createElement("div");
  gameHistorySection.className = "card mt-8 lg:col-span-3";

  const gameHistoryHeader = document.createElement("div");
  gameHistoryHeader.className = "flex justify-between items-center mb-4";

  const gameHistoryTitle = document.createElement("h2");
  gameHistoryTitle.className = "text-xl font-bold";
  gameHistoryTitle.textContent = "Game History";

  gameHistoryHeader.appendChild(gameHistoryTitle);

  const gameHistoryList = document.createElement("div");
  gameHistoryList.className = "overflow-x-auto";
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

  gameHistorySection.appendChild(gameHistoryHeader);
  gameHistorySection.appendChild(gameHistoryList);

  profileContent.appendChild(profileCard);
  profileContent.appendChild(statsCard);
  profileContent.appendChild(friendsCard);
  profileContent.appendChild(gameHistorySection);

  container.appendChild(pageHeader);
  container.appendChild(profileContent);

  loadGameHistory();
  loadUserStats();
  loadFriends();

  async function loadGameHistory() {
    const gameHistoryBody = document.getElementById("game-history-body");
    if (!gameHistoryBody) return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendUrl}/api/users/${user?.id}/games`, {
        headers: {
          Authorization: `Bearer ${authContext.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load game history");
      }

      const data = await response.json();

      if (data.games && data.games.length > 0) {
        gameHistoryBody.innerHTML = "";

        data.games.forEach((game: any) => {
          const isPlayer1 = game.player1_id === user?.id;
          const opponentName = isPlayer1 ? game.player2_name : game.player1_name;
          const userScore = isPlayer1 ? game.player1_score : game.player2_score;
          const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;

          let result = "Draw";
          let resultClass = "text-gray-400";

          if (game.status === "finished") {
            if (userScore > opponentScore) {
              result = "Win";
              resultClass = "text-green-500";
            } else if (userScore < opponentScore) {
              result = "Loss";
              resultClass = "text-red-500";
            }
          } else {
            result = "In Progress";
            resultClass = "text-yellow-500";
          }

          const row = document.createElement("tr");
          row.className = "border-b border-gray-700";
          row.innerHTML = `
            <td class="p-3">${new Date(game.created_at).toLocaleDateString()}</td>
            <td class="p-3">${opponentName}</td>
            <td class="p-3">${userScore} - ${opponentScore}</td>
            <td class="p-3"><span class="${resultClass}">${result}</span></td>
          `;

          row.style.cursor = "pointer";
          row.addEventListener("click", () => {
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
      console.error("Error loading game history:", error);

      if (gameHistoryBody) {
        gameHistoryBody.innerHTML = `
          <tr>
            <td class="p-3 text-center text-red-500" colspan="4">
              Failed to load game history
              <button id="retry-history" class="btn-primary ml-2 text-sm py-1 px-2">Retry</button>
            </td>
          </tr>
        `;

        const retryButton = document.getElementById("retry-history");
        if (retryButton) {
          retryButton.addEventListener("click", loadGameHistory);
        }
      }
    }
  }

  async function loadUserStats() {
    try {
      console.log("Loading user stats...");
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendUrl}/api/users/${user?.id}/games`, {
        headers: {
          Authorization: `Bearer ${authContext.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load user stats");
      }

      const data = await response.json();
      console.log("User games data:", data);

      let gamesPlayed = 0;
      let wins = 0;
      let losses = 0;
      let winRate = 0;

      if (data.games && Array.isArray(data.games)) {
        data.games.forEach((game: any) => {
          if (game.status === "finished") {
            gamesPlayed++;

            const userId = user?.id ? String(user.id) : "0";
            const isPlayer1 = String(game.player1_id) === userId;
            const userScore = isPlayer1 ? game.player1_score : game.player2_score;
            const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;

            if (userScore > opponentScore) {
              wins++;
            } else if (userScore < opponentScore) {
              losses++;
            }
          }
        });

        winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
      }

      console.log(`Stats: Games=${gamesPlayed}, Wins=${wins}, Losses=${losses}, WinRate=${winRate}%`);
      const gamesPlayedElement = document.getElementById("games-played");
      const winsElement = document.getElementById("wins");
      const lossesElement = document.getElementById("losses");
      const winRateElement = document.getElementById("win-rate");

      if (gamesPlayedElement) gamesPlayedElement.textContent = String(gamesPlayed);
      if (winsElement) winsElement.textContent = String(wins);
      if (lossesElement) lossesElement.textContent = String(losses);
      if (winRateElement) winRateElement.textContent = `${winRate}%`;
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  }

  function openEditProfileModal() {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    const modalContent = document.createElement("div");
    modalContent.className = "bg-background-light p-6 rounded-lg max-w-md w-full";

    const modalHeader = document.createElement("div");
    modalHeader.className = "flex justify-between items-center mb-4";

    const modalTitle = document.createElement("h2");
    modalTitle.className = "text-xl font-bold";
    modalTitle.textContent = "Edit Profile";

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

    const usernameGroup = document.createElement("div");

    const usernameLabel = document.createElement("label");
    usernameLabel.className = "block text-sm font-medium mb-2";
    usernameLabel.textContent = "Username";

    const usernameInput = document.createElement("input");
    usernameInput.className = "input w-full";
    usernameInput.type = "text";
    usernameInput.value = user?.username || "";
    usernameInput.required = true;

    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(usernameInput);

    const avatarGroup = document.createElement("div");

    const avatarLabel = document.createElement("label");
    avatarLabel.className = "block text-sm font-medium mb-2";
    avatarLabel.textContent = "Avatar URL (optional)";

    const avatarInput = document.createElement("input");
    avatarInput.className = "input w-full";
    avatarInput.type = "url";
    avatarInput.placeholder = "https://example.com/avatar.jpg";
    avatarInput.value = user?.avatar || "";

    avatarGroup.appendChild(avatarLabel);
    avatarGroup.appendChild(avatarInput);

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
    submitButton.textContent = "Save Changes";

    buttonsGroup.appendChild(cancelButton);
    buttonsGroup.appendChild(submitButton);

    form.appendChild(usernameGroup);
    form.appendChild(avatarGroup);
    form.appendChild(errorMessage);
    form.appendChild(buttonsGroup);

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newUsername = usernameInput.value.trim();
      const newAvatarUrl = avatarInput.value.trim();

      if (!newUsername) {
        errorMessage.textContent = "Username is required";
        errorMessage.classList.remove("hidden");
        return;
      }

      try {
        submitButton.textContent = "Saving...";
        submitButton.disabled = true;
        errorMessage.classList.add("hidden");

        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
        const response = await fetch(`${backendUrl}/api/users/${user?.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authContext.getToken()}`,
          },
          body: JSON.stringify({
            username: newUsername,
            avatar: newAvatarUrl || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update profile");
        }

        const data = await response.json();

        const updatedUser = {
          ...user,
          username: data.user.username,
          avatar: data.user.avatar,
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));

        await authContext.refreshUser();

        modal.remove();
        window.location.reload();
      } catch (error) {
        errorMessage.textContent = error instanceof Error ? error.message : "Failed to update profile";
        errorMessage.classList.remove("hidden");

        submitButton.textContent = "Save Changes";
        submitButton.disabled = false;
      }
    });
  }

  function openAddFriendModal() {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";

    const modalContent = document.createElement("div");
    modalContent.className = "bg-background-light p-6 rounded-lg max-w-md w-full";

    const modalHeader = document.createElement("div");
    modalHeader.className = "flex justify-between items-center mb-4";

    const modalTitle = document.createElement("h3");
    modalTitle.className = "text-xl font-bold";
    modalTitle.textContent = "Add Friend";

    const closeButton = document.createElement("button");
    closeButton.className = "text-gray-400 hover:text-white text-xl";
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", () => {
      modal.remove();
    });

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    const form = document.createElement("form");
    form.className = "space-y-4";

    const usernameGroup = document.createElement("div");

    const usernameLabel = document.createElement("label");
    usernameLabel.className = "block text-sm font-medium mb-2";
    usernameLabel.textContent = "Friend's Username";

    const usernameInput = document.createElement("input");
    usernameInput.className = "input w-full";
    usernameInput.type = "text";
    usernameInput.placeholder = "Enter username";
    usernameInput.required = true;

    usernameGroup.appendChild(usernameLabel);
    usernameGroup.appendChild(usernameInput);

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
    submitButton.textContent = "Send Request";

    buttonsGroup.appendChild(cancelButton);
    buttonsGroup.appendChild(submitButton);

    form.appendChild(usernameGroup);
    form.appendChild(errorMessage);
    form.appendChild(buttonsGroup);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = usernameInput.value.trim();

      if (!username) {
        errorMessage.textContent = "Username is required";
        errorMessage.classList.remove("hidden");
        return;
      }

      try {
        submitButton.textContent = "Sending...";
        submitButton.disabled = true;
        errorMessage.classList.add("hidden");

        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";

        console.log(`Searching for user with username: ${username}`);
        const userResponse = await fetch(`${backendUrl}/api/users`, {
          headers: {
            Authorization: `Bearer ${authContext.getToken()}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error("Failed to fetch users");
        }

        const usersData = await userResponse.json();
        const friendUser = usersData.users.find((u: { username: string; id: number }) => u.username === username);

        if (!friendUser) {
          throw new Error("User not found");
        }

        console.log(`Found user with ID: ${friendUser.id}`);

        console.log(`Sending friend request to user ID: ${friendUser.id}`);
        const response = await fetch(`${backendUrl}/api/friends/request/${friendUser.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authContext.getToken()}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send friend request");
        }

        modal.remove();
        loadFriends();

        const successMessage = document.createElement("div");
        successMessage.className = "fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg";
        successMessage.textContent = "Friend request sent!";
        document.body.appendChild(successMessage);
        setTimeout(() => {
          successMessage.remove();
        }, 3000);
      } catch (error) {
        console.error("Friend request error:", error);

        let errorText = "Failed to send friend request";

        if (error instanceof Error) {
          errorText = error.message;
        }

        if (errorText === "Bad Request") {
          errorText = "Cannot add this user as a friend. You may already be friends or have a pending request.";
        }

        errorMessage.textContent = errorText;
        errorMessage.classList.remove("hidden");

        submitButton.textContent = "Send Request";
        submitButton.disabled = false;
      }
    });

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(form);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
  }

  async function loadFriends() {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${backendUrl}/api/friends`, {
        headers: {
          Authorization: `Bearer ${authContext.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load friends");
      }

      const data = await response.json();

      if (data.friends.length === 0) {
        friendsList.innerHTML = `<div class="text-center text-gray-400 py-2">No friends yet</div>`;
      } else {
        friendsList.innerHTML = "";

        data.friends.forEach((friend: any) => {
          const friendItem = document.createElement("div");
          friendItem.className = "flex items-center justify-between bg-background-dark p-2 rounded-lg";

          const friendInfo = document.createElement("div");
          friendInfo.className = "flex items-center";

          const friendAvatar = document.createElement("div");
          friendAvatar.className =
            "w-10 h-10 rounded-full bg-primary flex items-center justify-center mr-3 overflow-hidden";

          if (friend.avatar) {
            const img = document.createElement("img");
            img.src = friend.avatar;
            img.alt = friend.username || "Friend avatar";
            img.className = "w-full h-full object-cover";
            img.onerror = () => {
              img.remove();
              friendAvatar.textContent = friend.username.charAt(0).toUpperCase();
            };
            friendAvatar.textContent = "";
            friendAvatar.appendChild(img);
          } else {
            friendAvatar.textContent = friend.username.charAt(0).toUpperCase();
          }

          const statusIndicator = document.createElement("div");
          statusIndicator.className = `absolute w-3 h-3 rounded-full ${
            friend.status === "online" ? "bg-green-500" : "bg-gray-500"
          } border border-background-dark bottom-0 right-0`;

          const avatarContainer = document.createElement("div");
          avatarContainer.className = "relative";
          avatarContainer.appendChild(friendAvatar);
          avatarContainer.appendChild(statusIndicator);

          const friendName = document.createElement("div");
          friendName.textContent = friend.username;

          friendInfo.appendChild(avatarContainer);
          friendInfo.appendChild(friendName);

          const removeButton = document.createElement("button");
          removeButton.className = "text-red-500 hover:text-red-300";
          removeButton.textContent = "Remove";
          removeButton.addEventListener("click", async () => {
            try {
              const response = await fetch(`${backendUrl}/api/friends/${friend.id}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${authContext.getToken()}`,
                },
              });

              if (!response.ok) {
                throw new Error("Failed to remove friend");
              }

              loadFriends();
            } catch (error) {
              console.error("Error removing friend:", error);
            }
          });

          friendItem.appendChild(friendInfo);
          friendItem.appendChild(removeButton);

          friendsList.appendChild(friendItem);
        });
      }

      pendingRequestsList.innerHTML = "";

      const pendingReceivedCount = data.pendingRequests.received.length;
      const pendingSentCount = data.pendingRequests.sent.length;

      if (pendingReceivedCount > 0 || pendingSentCount > 0) {
        const pendingTitle = document.createElement("h3");
        pendingTitle.className = "text-sm font-bold mb-2";
        pendingTitle.textContent = "Pending Requests";
        pendingRequestsList.appendChild(pendingTitle);
      }

      data.pendingRequests.received.forEach((request: any) => {
        const requestItem = document.createElement("div");
        requestItem.className = "flex items-center justify-between bg-background-dark p-2 rounded-lg";

        const userInfo = document.createElement("div");
        userInfo.innerHTML = `<span class="text-primary">${request.username}</span> wants to be your friend`;

        const buttonGroup = document.createElement("div");
        buttonGroup.className = "flex space-x-2";

        const acceptButton = document.createElement("button");
        acceptButton.className = "btn-success btn-xs";
        acceptButton.textContent = "Accept";
        acceptButton.addEventListener("click", async () => {
          try {
            const response = await fetch(`${backendUrl}/api/friends/accept/${request.friendship_id}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${authContext.getToken()}`,
              },
            });

            if (!response.ok) {
              throw new Error("Failed to accept friend request");
            }

            loadFriends();
          } catch (error) {
            console.error("Error accepting friend request:", error);
          }
        });

        const rejectButton = document.createElement("button");
        rejectButton.className = "btn-error btn-xs";
        rejectButton.textContent = "Reject";
        rejectButton.addEventListener("click", async () => {
          try {
            const response = await fetch(`${backendUrl}/api/friends/reject/${request.friendship_id}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${authContext.getToken()}`,
              },
            });

            if (!response.ok) {
              throw new Error("Failed to reject friend request");
            }

            loadFriends();
          } catch (error) {
            console.error("Error rejecting friend request:", error);
          }
        });

        buttonGroup.appendChild(acceptButton);
        buttonGroup.appendChild(rejectButton);

        requestItem.appendChild(userInfo);
        requestItem.appendChild(buttonGroup);

        pendingRequestsList.appendChild(requestItem);
      });

      data.pendingRequests.sent.forEach((request: any) => {
        const requestItem = document.createElement("div");
        requestItem.className = "flex items-center justify-between bg-background-dark p-2 rounded-lg";

        const userInfo = document.createElement("div");
        userInfo.innerHTML = `Request sent to <span class="text-primary">${request.username}</span>`;

        const cancelButton = document.createElement("button");
        cancelButton.className = "btn-outline btn-xs";
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", async () => {
          try {
            const response = await fetch(`${backendUrl}/api/friends/${request.id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${authContext.getToken()}`,
              },
            });

            if (!response.ok) {
              throw new Error("Failed to cancel friend request");
            }

            loadFriends();
          } catch (error) {
            console.error("Error canceling friend request:", error);
          }
        });

        requestItem.appendChild(userInfo);
        requestItem.appendChild(cancelButton);

        pendingRequestsList.appendChild(requestItem);
      });
    } catch (error) {
      console.error("Error loading friends:", error);
      friendsList.innerHTML = `<div class="text-center text-red-500 py-2">Failed to load friends</div>`;
    }
  }

  return container;
}
