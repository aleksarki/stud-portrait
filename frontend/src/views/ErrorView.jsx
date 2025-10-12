import { useRouteError } from 'react-router-dom';
import Header from '../components/Header';
import './ErrorView.scss';

function ErrorView() {
    const error = useRouteError();
    console.error(error);
    return (
        <div className="ErrorView">
            <Header />
            <span>Несуществующая страница</span>
        </div>
    );
}

export default ErrorView;
