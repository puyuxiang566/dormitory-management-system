import { prisma } from '../src/lib/prisma';

async function main() {
  const roomNumbers = ['601', '602', '603', '604', '605', '606', '607', '608', '609'];
  
  // 先查询这些房间
  console.log('查询房间...');
  const rooms = await prisma.room.findMany({
    where: {
      roomNumber: {
        in: roomNumbers,
      },
    },
    include: {
      building: true,
      person: true,
    },
  });
  
  console.log(`找到 ${rooms.length} 个房间:`);
  for (const room of rooms) {
    console.log(`  - 房间号: ${room.roomNumber}, 楼栋: ${room.building?.name || '无'}, ID: ${room.id}, 入住人数: ${room.person?.length || 0}`);
  }
  
  // 删除这些房间（先删除关联的人员记录）
  console.log('\n开始删除...');
  for (const room of rooms) {
    try {
      // 先删除房间内的人员
      if (room.person && room.person.length > 0) {
        await prisma.person.deleteMany({
          where: {
            roomId: room.id,
          },
        });
        console.log(`  删除房间 ${room.roomNumber} 的 ${room.person.length} 个人员记录`);
      }
      
      // 删除房间
      await prisma.room.delete({
        where: {
          id: room.id,
        },
      });
      console.log(`  已删除房间: ${room.roomNumber} (ID: ${room.id})`);
    } catch (err: any) {
      console.error(`  删除房间 ${room.roomNumber} 失败:`, err.message);
    }
  }
  
  console.log('\n完成!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
