import React from 'react'
import { Link } from 'react-router-dom'

const InitialPage = () => {
    return (
        <div>
            <Link to='/dirigido'>
                dirigido
            </Link>

            <Link to='/no-dirigido'>
                no dirigido
            </Link>
        </div>
    )
}

export default InitialPage;
