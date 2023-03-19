import React from 'react'
import { BrowserRouter, Route, Routes, Navigate, Link } from 'react-router-dom'
import { Followers } from '../components/follow/Followers'
import { Following } from '../components/follow/Following'
import { PrivateLayout } from '../components/layout/private/PrivateLayout'
import { PublicLayout } from '../components/layout/public/PublicLayout'
import { Feed } from '../components/publication/Feed'
import { Confing } from '../components/user/Confing'
import { Login } from '../components/user/Login'
import { Logout } from '../components/user/Logout'
import { People } from '../components/user/People'
import { Register } from '../components/user/Register'
import { AuthProvider } from '../context/AuthProvider'
import { Profile } from '../components/user/Profile'

export const Routing = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>

                    <Route path='/' element={<PublicLayout />}>
                        <Route index element={<Login />} />
                        <Route path='login' element={<Login />} />
                        <Route path='registro' element={<Register />} />
                    </Route>

                    <Route path='/social' element={<PrivateLayout />}>
                        <Route index element={<Feed />} />
                        <Route path='feed' element={<Feed />} />
                        <Route path='logout' element={<Logout />} />
                        <Route path='gente' element={<People />} />
                        <Route path='ajustes' element={<Confing />} />
                        <Route path='siguiendo/:userId' element={<Following />} />
                        <Route path='seguidores/:userId' element={<Followers />} />
                        <Route path='perfil/:userId' element={<Profile />} />
                    </Route>

                    <Route path='*' element={
                        <>
                            <p>
                                <h1>Error 404</h1>
                                <Link to='/'>Volver al Inicio</Link>
                            </p>
                        </>
                    } />

                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}
