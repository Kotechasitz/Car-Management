import { Layout, Typography, theme } from "antd";
import type { CSSProperties } from "react";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { CarListPage } from "./pages/CarListPage";

const layoutStyle: CSSProperties = { minHeight: "100vh" };
const headerStyle: CSSProperties = { display: "flex", alignItems: "center" };
const contentStyle: CSSProperties = { padding: 24 };

export default function App() {
  const { token } = theme.useToken();
  const headerTitleStyle: CSSProperties = {
    color: "#fff",
    margin: 0,
    fontSize: token.fontSizeHeading3,
    lineHeight: token.lineHeightHeading3,
  };

  return (
    <Layout style={layoutStyle}>
      <Layout.Header style={headerStyle}>
        <Typography.Title level={1} style={headerTitleStyle}>
          ระบบจัดการข้อมูลรถยนต์
        </Typography.Title>
      </Layout.Header>
      <Layout.Content style={contentStyle}>
        <AppErrorBoundary>
          <CarListPage />
        </AppErrorBoundary>
      </Layout.Content>
    </Layout>
  );
}
