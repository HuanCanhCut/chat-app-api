const ProductModel = require('../models/product')

const deleteProduct = async ({ socket, io }) => {
    socket.on('get-products', async () => {
        try {
            const products = await ProductModel.find({}).sort({ category: 1 })

            io.emit('new-products', {
                data: products,
            })
        } catch (error) {
            console.log(error)
        }
    })
}

module.exports = deleteProduct
