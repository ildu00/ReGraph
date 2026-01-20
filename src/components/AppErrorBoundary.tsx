import React from "react";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
};

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown) {
    // Keep logging minimal but useful for debugging blank screens
    // eslint-disable-next-line no-console
    console.error("App crashed:", error);
  }

  private handleReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("__reload", Date.now().toString());
    window.location.replace(url.toString());
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
            <h1 className="text-xl font-semibold">Приложение не загрузилось</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Похоже, произошла ошибка при загрузке. Нажмите «Перезагрузить».
            </p>
            {this.state.errorMessage ? (
              <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                {this.state.errorMessage}
              </pre>
            ) : null}
            <div className="mt-5 flex gap-3">
              <Button onClick={this.handleReload}>Перезагрузить</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
