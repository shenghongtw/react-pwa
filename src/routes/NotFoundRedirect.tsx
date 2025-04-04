import { FC } from 'react';
import { Navigate } from 'react-router-dom';

const NotFoundRedirect: FC = () => <Navigate to="/" />;

export default NotFoundRedirect;
