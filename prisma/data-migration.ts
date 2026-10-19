import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  // 1. Randomize factory for existing persons
  const persons = await prisma.person.findMany();
  let imcnCount = 0;
  let imawCount = 0;
  
  for (const person of persons) {
    const factory = Math.random() < 0.5 ? 'imcn' : 'imaw';
    await prisma.person.update({
      where: { id: person.id },
      data: { factory }
    });
    if (factory === 'imcn') imcnCount++;
    else imawCount++;
  }
  console.log(`Updated ${persons.length} persons: ${imcnCount} imcn, ${imawCount} imaw.`);

  // 2. Rename rooms to start with '8'
  const rooms = await prisma.room.findMany();
  let renamedCount = 0;
  for (const room of rooms) {
    if (!room.roomNumber.startsWith('8')) {
      // Ensure it starts with 8 and maintains length if possible, or simple prepend
      // Assuming original room number like '101' -> '8101'
      // If original starts with a number, maybe just prepend '8' or handle specific formats
      let newName = '';
      if (room.roomNumber.match(/^\d+$/)) {
          // If it's already a number like '101'
          newName = `8${room.roomNumber.replace(/^0+/, '')}`;
      } else {
          // Fallback, just prepend 8
          newName = `8-${room.roomNumber}`;
      }
      
      // Update room
      try {
        await prisma.room.update({
          where: { id: room.id },
          data: { roomNumber: newName }
        });
        renamedCount++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          console.warn(`Room rename collision for ${newName}, generating unique name...`);
          await prisma.room.update({
             where: { id: room.id },
             data: { roomNumber: `${newName}-${room.id}` }
          });
          renamedCount++;
        }
      }
    }
  }
  console.log(`Renamed ${renamedCount} rooms to start with '8'.`);
  
  console.log('Data migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
