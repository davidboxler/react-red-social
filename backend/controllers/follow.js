// Importar modelo
const Follow = require("../models/follow")
const User = require("../models/user")

// Importar Servicios
const followService = require("../services/followService")

// Importar dependencias
const mongoosePagination = require("mongoose-pagination")

// Acciones de prueba
const pruebaFollow = (req, res) => {
    return res.status(200).send({
        message: "Mensaje enviado desde: controllers/follow.js"
    })
}

// Accion de guardar un follow (accion de seguir)
const save = (req, res) => {
    // Conseguir datos por body
    const params = req.body

    // Sacar el id del usuario identificado
    const identity = req.user

    // Crear objeto en bbdd
    let userToFollow = new Follow({
        user: identity.id,
        followed: params.followed
    })

    // Guardar objeto en bbdd
    userToFollow.save((error, followStored) => {
        if (error || !followStored) {
            return res.status(200).send({
                status: "success",
                mensage: "No se ha podido seguir el usuario",
            })
        }

        return res.status(200).send({
            status: "success",
            identity: req.user,
            follow: followStored
        })
    })
}

// Accion de dejar de seguir a un usuario
const unfollow = (req, res) => {
    // Recoger el id del usuario identificado
    const userId = req.user.id

    // Recoger el id del usuario que sigo y quiero dejar de seguir
    const followId = req.params.id

    // Buscar las concidencias y remover
    Follow.find({
        "user": userId,
        "followed": followId
    }).remove((error, followDelete) => {
        if (error || !followDelete) {
            return res.status(500).send({
                status: "success",
                message: "No has dejado de seguir a nadie"
            })
        }

        return res.status(200).send({
            status: "success",
            mensage: "Seguido eliminado correctamente"
        })
    })
}

// Listado de usuarios que cualquier usuario está siguiendo (siguiendo)
const following = (req, res) => {
    // Sacar el id del usuario identificado
    let userId = req.user.id

    // Comprobar si me llega el id por parametro en la url
    if (req.params.id) userId = req.params.id

    // Comprobar si me llega la pagina, si no la pagina 1
    let page = 1

    if (req.params.page) page = req.params.page

    // Cantidad de usuarios por pagina
    const itemsPerPage = 5

    // Find a follow, popular datos de los usuarios y paginar con moongose pagination
    Follow.find({ user: userId })
        .populate("user followed", "-password -role -__v -email")
        .paginate(page, itemsPerPage, async (error, follows, total) => {

            let followUserId = await followService.followUserIds(req.user.id)

            return res.status(200).send({
                status: "success",
                message: "Listado de usuarios que estoy siguiendo",
                follows,
                total,
                pages: Math.ceil(total / itemsPerPage),
                user_following: followUserId.following,
                user_followers: followUserId.followers
            })
        })
}

// Listado de usuarios que siguen a cualquier otro usuario (soy seguido)
const followers = (req, res) => {
    // Sacar el id del usuario identificado
    let userId = req.user.id

    // Comprobar si me llega el id por parametro en url
    if (req.params.id) userId = req.params.id

    // Comprobar si me llega la pagina, si no la pagina 1
    let page = 1

    if (req.params.page) page = req.params.page

    // Usuarios por pagina quiero mostrar
    const itemsPerPage = 5

    // Find a follow, popular datos de los usuarios y paginar con moongose pagination
    Follow.find({ followed: userId })
        .populate("user followed", "-password -role -__v -email")
        .paginate(page, itemsPerPage, async(error, follows, total) => {

            let followUserId = await followService.followUserIds(req.user.id)

            return res.status(200).send({
                status: "success",
                message: "Listado de usuarios que estoy siguiendo",
                follows,
                total,
                pages: Math.ceil(total / itemsPerPage),
                user_following: followUserId.following,
                user_followers: followUserId.followers
            })
        })
}

// Exportar acciones
module.exports = { pruebaFollow, save, unfollow, followers, following }