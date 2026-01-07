import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface PublicRouteProps {
  children: ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const accessToken = localStorage.getItem('accessToken');
  
  // 로그인 상태면 랜딩 페이지로 리다이렉트
  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
