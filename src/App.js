import React from 'react';
import { BrowserRouter, Route, Switch} from 'react-router-dom'
import Main from './components/Main';
import Header from './components/Header';
import MainNotDirected from './components/MainNotDirected';
import InitialPage from './components/InitialPage';

const App = () => (
  <BrowserRouter>
    <Header />
    <Switch>
      <Route exact path='/' component={InitialPage} />
      <Route exact path='/dirigido' component={Main} />
      <Route exact path='/no-dirigido' component={MainNotDirected} />
    </Switch>
    

  </BrowserRouter>

)

export default App;
