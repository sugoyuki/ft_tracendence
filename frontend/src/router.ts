type Route = {
  path: string;
  component: () => Promise<HTMLElement>;
  requiresAuth?: boolean;
};

export function createRouter(authContext: any) {
  const routes: Route[] = [
    {
      path: '/',
      component: () => import('./pages/Home').then(m => m.default())
    },
    {
      path: '/login',
      component: () => import('./pages/Login').then(m => m.default())
    },
    {
      path: '/register',
      component: () => import('./pages/Register').then(m => m.default())
    },
    {
      path: '/profile',
      component: () => import('./pages/Profile').then(m => m.default()),
      requiresAuth: true
    },
    {
      path: '/games',
      component: () => import('./pages/Games').then(m => m.default())
    },
    {
      path: '/game/:id',
      component: () => import('./pages/Game').then(m => m.default())
    },
    {
      path: '/tournaments',
      component: () => import('./pages/Tournament').then(m => m.default())
    },
    {
      path: '/tournament/:id',
      component: () => import('./pages/TournamentDetail').then(m => m.default())
    }
  ];

  let currentComponent: HTMLElement | null = null;
  let contentContainer: HTMLElement;

  // Handle navigation
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    renderRoute(path);
  };

  // Match route from path
  const findRouteMatch = (path: string) => {
    // First try exact match
    let route = routes.find(r => r.path === path);
    
    // If no exact match, try to match routes with params
    if (!route) {
      // Find routes with params (indicated by :)
      const routesWithParams = routes.filter(r => r.path.includes(':'));
      
      for (const paramRoute of routesWithParams) {
        // Convert route pattern to regex
        const pattern = paramRoute.path.replace(/:[^\/]+/g, '([^\/]+)');
        const regex = new RegExp(`^${pattern}$`);
        
        if (regex.test(path)) {
          route = paramRoute;
          break;
        }
      }
    }
    
    return route || routes[0]; // Default to home if no match
  };

  // Extract params from path
  const extractParams = (routePath: string, currentPath: string) => {
    const params: Record<string, string> = {};
    
    const routeParts = routePath.split('/');
    const pathParts = currentPath.split('/');
    
    routeParts.forEach((part, i) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1);
        params[paramName] = pathParts[i];
      }
    });
    
    return params;
  };

  // Render the route component
  const renderRoute = async (path: string) => {
    // Find matching route
    const matchedRoute = findRouteMatch(path);
    
    // Check if route requires authentication
    if (matchedRoute.requiresAuth && !authContext.isAuthenticated()) {
      navigateTo('/login');
      return;
    }
    
    try {
      // Clear current content
      if (currentComponent && contentContainer.contains(currentComponent)) {
        contentContainer.removeChild(currentComponent);
      }
      
      // Create new component
      const component = await matchedRoute.component();
      
      // If the route has params, store them in window for component to access
      if (matchedRoute.path.includes(':')) {
        const params = extractParams(matchedRoute.path, path);
        // Store route params in window for component to access
        (window as any).__ROUTE_PARAMS__ = params;
      } else {
        // Clear params if not needed
        (window as any).__ROUTE_PARAMS__ = {};
      }
      
      // Add new component to container
      contentContainer.appendChild(component);
      currentComponent = component;
      
      // Scroll to top
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error rendering route:', error);
      navigateTo('/');
    }
  };

  // Initialize router
  const init = (container: HTMLElement) => {
    contentContainer = container;
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
      renderRoute(window.location.pathname);
    });
    
    // Render initial route
    renderRoute(window.location.pathname);
  };

  return {
    init,
    navigateTo
  };
}
