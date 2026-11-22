import { Button, Result } from "antd";
import { Component, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

function reloadPage(): void {
  window.location.reload();
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="เกิดข้อผิดพลาดในการแสดงผล"
          subTitle="กรุณาโหลดหน้าใหม่อีกครั้ง"
          extra={
            <Button type="primary" onClick={reloadPage}>
              โหลดหน้าใหม่
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
