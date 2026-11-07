import heroImg from './assets/hero.png'
import './App.css'

import {loadRequirements} from './parser'

function App() {

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
        </div>

        <section id="notes">
          {Object.keys(loadRequirements()).map((den) => {
            return <span>{den}</span>
          })}
        </section>
      </section>

      <section id="spacer"></section>
    </>
  )
}

export default App
