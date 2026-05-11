import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const warehouse1 = await prisma.warehouse.create({
    data: { name: 'New York Warehouse', location: 'NY, USA' }
  })

  const warehouse2 = await prisma.warehouse.create({
    data: { name: 'Los Angeles Warehouse', location: 'LA, USA' }
  })

  const product1 = await prisma.product.create({
    data: {
      name: 'Mechanical Keyboard',
      description: 'Tactile mechanical keyboard with RGB.',
      price: 120.0,
      imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=600',
    }
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse.',
      price: 60.0,
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=600',
    }
  })

  await prisma.inventory.create({
    data: {
      productId: product1.id,
      warehouseId: warehouse1.id,
      totalUnits: 10,
      reservedUnits: 0
    }
  })

  await prisma.inventory.create({
    data: {
      productId: product1.id,
      warehouseId: warehouse2.id,
      totalUnits: 5,
      reservedUnits: 0
    }
  })

  await prisma.inventory.create({
    data: {
      productId: product2.id,
      warehouseId: warehouse1.id,
      totalUnits: 20,
      reservedUnits: 0
    }
  })

  console.log('Seed completed successfully.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
