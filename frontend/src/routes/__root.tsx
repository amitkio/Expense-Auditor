import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import appCss from "../styles.css?url";

import { ClerkProvider } from "@clerk/tanstack-react-start";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const THEME_INIT_SCRIPT = `(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored;
    
    if (!stored) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'forest' 
        : 'nord';
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = (theme === 'forest') ? 'dark' : 'light';
  } catch (e) {}
})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Expense Auditor",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased wrap-anywhere selection:bg-[rgba(79,184,178,0.24)]">
        <ClerkProvider
          appearance={{
            theme: "simple",
          }}
        >
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </ClerkProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
