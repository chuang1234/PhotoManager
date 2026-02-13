import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import AlbumList from "./pages/AlbumList";
import AlbumDetail from "./pages/AlbumDetail";
import Login from "./pages/Login";
import PrivateRoute from "./components/PrivateRoute";
import { MemberProvider } from "./contexts/MemberContext"; // 引入成员上下文
import { ConfigProvider, Layout, Button, message } from "antd";
import zhCN from "antd/locale/zh_CN";
import CreateAlbum from "./pages/CreateAlbum";
import FavoriteManager from "./pages/FavoriteManager";
import HeaderComponent from "./components/HeaderComponent";

const { Content } = Layout;

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      {/* 包裹成员上下文 */}
      <MemberProvider>
        <Router>
          <Layout style={{ minHeight: "100vh" }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <>
                      <HeaderComponent />
                      <Content style={{ padding: 20 }}>
                        <Routes>
                          {/* 根路由作为父路由 */}
                          <Route path="/" element={<AlbumList />}>
                            {/* index 路由：访问 / 时，渲染父路由的 element（AlbumList） */}
                            <Route index element={<AlbumList />} />
                          </Route>
                          {/* 保留 /albums 路由，同样渲染 AlbumList */}
                          <Route path="/albums" element={<AlbumList />} />
                          {/* 其他路由不变 */}
                          <Route
                            path="/create-album"
                            element={<CreateAlbum />}
                          />
                          <Route
                            path="/album/:albumId"
                            element={<AlbumDetail />}
                          />
                          <Route
                            path="/favorite"
                            element={<FavoriteManager />}
                          />
                        </Routes>
                      </Content>
                    </>
                  </PrivateRoute>
                }
              />
            </Routes>
          </Layout>
        </Router>
      </MemberProvider>
    </ConfigProvider>
  );
}

export default App;
