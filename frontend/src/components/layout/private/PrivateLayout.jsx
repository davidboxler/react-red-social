import React from 'react'
import { Header } from '../private/Header'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import useAuth from '../../../hooks/useAuth'

export const PrivateLayout = () => {

    const { auth, loading } = useAuth()

    if (loading) {
        return <h1>Cargando....</h1>
    }
    else {
        return (
            <>
                {/*LAYOUT*/}

                {/* Cabecera y navegación */}
                <Header />

                {/* Contenido principal */}
                <section className='layout__content'>
                    {auth._id ?
                        <Outlet />
                        :
                        <Navigate to='/login' />}
                </section>

                {/* Barra Lateral */}
                <Sidebar />

            </>
        )
    }
}
