type Route = {
  path: string;
  component: () => Promise<HTMLElement>;
  requiresAuth?: boolean;
};

export function createRouter(authContext: any) {
  const routes: Route[] = [
    {
      path: "/",
      component: () => import("./pages/Home").then((m) => m.default()),
    },
    {
      path: "/login",
      component: () => import("./pages/Login").then((m) => m.default()),
    },
    {
      path: "/register",
      component: () => import("./pages/Register").then((m) => m.default()),
    },
    {
      path: "/profile",
      component: () => import("./pages/Profile").then((m) => m.default()),
      requiresAuth: true,
    },
    {
      path: "/games",
      component: () => import("./pages/Games").then((m) => m.default()),
    },
    {
      path: "/game/:id",
      component: () => import("./pages/Game").then((m) => m.default()),
    },
    {
      path: "/tournaments",
      component: () => import("./pages/Tournament").then((m) => m.default()),
    },
    {
      path: "/tournament/:id",
      component: () => import("./pages/TournamentDetail").then((m) => m.default()),
    },
  ];

  let currentComponent: HTMLElement | null = null;
  let contentContainer: HTMLElement;

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    renderRoute(path);
  };

  const findRouteMatch = (path: string) => {
    let route = routes.find((r) => r.path === path);

    if (!route) {
      const routesWithParams = routes.filter((r) => r.path.includes(":"));

      for (const paramRoute of routesWithParams) {
        const pattern = paramRoute.path.replace(/:[^\/]+/g, "([^/]+)");
        const regex = new RegExp(`^${pattern}$`);

        if (regex.test(path)) {
          route = paramRoute;
          break;
        }
      }
    }

    return route || routes[0];
  };

  const extractParams = (routePath: string, currentPath: string) => {
    const params: Record<string, string> = {};

    const routeParts = routePath.split("/");
    const pathParts = currentPath.split("/");

    routeParts.forEach((part, i) => {
      if (part.startsWith(":")) {
        const paramName = part.slice(1);
        params[paramName] = pathParts[i];
      }
    });

    return params;
  };

  const renderRoute = async (path: string) => {
    const matchedRoute = findRouteMatch(path);

    if (matchedRoute.requiresAuth && !authContext.isAuthenticated()) {
      navigateTo("/login");
      return;
    }

    try {
      if (currentComponent && contentContainer.contains(currentComponent)) {
        contentContainer.removeChild(currentComponent);
      }

      const component = await matchedRoute.component();

      if (matchedRoute.path.includes(":")) {
        const params = extractParams(matchedRoute.path, path);
        (window as any).__ROUTE_PARAMS__ = params;
      } else {
        (window as any).__ROUTE_PARAMS__ = {};
      }

      contentContainer.appendChild(component);
      currentComponent = component;

      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error rendering route:", error);
      navigateTo("/");
    }
  };

  const init = (container: HTMLElement) => {
    contentContainer = container;

    window.addEventListener("popstate", () => {
      renderRoute(window.location.pathname);
    });

    renderRoute(window.location.pathname);
  };

  return {
    init,
    navigateTo,
  };
}
