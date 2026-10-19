import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  const hashedPassword = await bcrypt.hash('admin123', 4);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('创建管理员用户:', adminUser.username);

  const building1 = await prisma.building.upsert({
    where: { name: '1号楼' },
    update: {},
    create: {
      name: '1号楼',
      description: '员工宿舍楼A栋',
      address: '园区东区',
      floors: 6,
    },
  });

  const building2 = await prisma.building.upsert({
    where: { name: '2号楼' },
    update: {},
    create: {
      name: '2号楼',
      description: '员工宿舍楼B栋',
      address: '园区西区',
      floors: 6,
    },
  });

  console.log('创建楼栋:', building1.name, building2.name);

  const rooms = [];
  for (let floor = 1; floor <= 6; floor++) {
    for (let room = 1; room <= 10; room++) {
      const roomNumber = `${floor}0${room}`.slice(-3);
      rooms.push({
        buildingId: building1.id,
        floorNumber: floor,
        roomNumber: roomNumber,
        bedCount: 4,
        status: 'VACANT',
      });
    }
  }

  for (let floor = 1; floor <= 6; floor++) {
    for (let room = 1; room <= 10; room++) {
      const roomNumber = `${floor}0${room}`.slice(-3);
      rooms.push({
        buildingId: building2.id,
        floorNumber: floor,
        roomNumber: roomNumber,
        bedCount: 4,
        status: 'VACANT',
      });
    }
  }

  for (const roomData of rooms) {
    await prisma.room.upsert({
      where: {
        buildingId_roomNumber: {
          buildingId: roomData.buildingId,
          roomNumber: roomData.roomNumber,
        },
      },
      update: {},
      create: roomData,
    });
  }

  console.log('创建房间:', rooms.length, '个');

  const allRooms = await prisma.room.findMany({
    where: { buildingId: building1.id },
    take: 10,
  });

  const demoPersons = [
    {
      employeeId: 'E001',
      name: '张三',
      department: '技术部',
      position: '高级工程师',
      phone: '13800138001',
      idCard: '320222202503032222',
      gender: 'MALE',
      status: 'ACTIVE',
      buildingId: building1.id,
      roomId: allRooms[0]?.id,
      bedNumber: 'A床',
      checkInDate: new Date('2024-01-15'),
      emergencyContacts: {
        create: [
          { name: '张伟', relationship: '父亲', phone: '13900139001', note: '主要联系人' },
        ],
      },
    },
    {
      employeeId: 'E002',
      name: '李四',
      department: '人事部',
      position: '人事主管',
      phone: '13800138002',
      idCard: '320222202503032223',
      gender: 'FEMALE',
      status: 'ACTIVE',
      buildingId: building1.id,
      roomId: allRooms[1]?.id,
      bedNumber: 'B床',
      checkInDate: new Date('2024-02-01'),
      emergencyContacts: {
        create: [
          { name: '王芳', relationship: '母亲', phone: '13900139003', note: '备用联系人' },
        ],
      },
    },
    {
      employeeId: 'E003',
      name: '王五',
      department: '财务部',
      position: '会计',
      phone: '13800138003',
      idCard: '320222202503032224',
      gender: 'MALE',
      status: 'ACTIVE',
      buildingId: building1.id,
      roomId: allRooms[2]?.id,
      bedNumber: 'C床',
      checkInDate: new Date('2024-02-15'),
      emergencyContacts: {
        create: [
          { name: '王建国', relationship: '父亲', phone: '13900139004' },
        ],
      },
    },
    {
      employeeId: 'E004',
      name: '赵六',
      department: '市场部',
      position: '市场经理',
      phone: '13800138004',
      idCard: '320222202503032225',
      gender: 'FEMALE',
      status: 'ACTIVE',
      buildingId: building1.id,
      roomId: allRooms[3]?.id,
      bedNumber: 'A床',
      checkInDate: new Date('2024-03-01'),
      emergencyContacts: {
        create: [
          { name: '赵军', relationship: '哥哥', phone: '13900139005' },
        ],
      },
    },
    {
      employeeId: 'E005',
      name: '钱七',
      department: '技术部',
      position: '前端工程师',
      phone: '13800138005',
      idCard: '320222202503032226',
      gender: 'MALE',
      status: 'ACTIVE',
      buildingId: building1.id,
      roomId: allRooms[0]?.id,
      bedNumber: 'B床',
      checkInDate: new Date('2024-03-10'),
      emergencyContacts: {
        create: [
          { name: '钱多多', relationship: '父亲', phone: '13900139006' },
        ],
      },
    },
    {
      employeeId: 'E006',
      name: '孙八',
      department: '技术部',
      position: '后端工程师',
      phone: '13800138006',
      idCard: '320222202503032227',
      gender: 'MALE',
      status: 'ACTIVE',
      buildingId: building1.id,
      roomId: allRooms[1]?.id,
      bedNumber: 'C床',
      checkInDate: new Date('2024-03-15'),
      emergencyContacts: {
        create: [
          { name: '孙建国', relationship: '父亲', phone: '13900139007' },
        ],
      },
    },
    {
      employeeId: 'E007',
      name: '周九',
      department: '行政部',
      position: '行政专员',
      phone: '13800138007',
      idCard: '320222202503032228',
      gender: 'MALE',
      status: 'ACTIVE',
      buildingId: building1.id,
      roomId: allRooms[4]?.id,
      bedNumber: 'A床',
      checkInDate: new Date('2024-04-01'),
      emergencyContacts: {
        create: [
          { name: '周强', relationship: '父亲', phone: '13900139009' },
        ],
      },
    },
    {
      employeeId: 'E008',
      name: '吴十',
      department: '销售部',
      position: '销售代表',
      phone: '13800138008',
      idCard: '320222202503032229',
      gender: 'MALE',
      status: 'ACTIVE',
      buildingId: building1.id,
      roomId: allRooms[5]?.id,
      bedNumber: 'B床',
      checkInDate: new Date('2024-04-15'),
      emergencyContacts: {
        create: [
          { name: '吴建国', relationship: '父亲', phone: '13900139010' },
        ],
      },
    },
  ];

  for (const personData of demoPersons) {
    const { emergencyContacts, ...person } = personData;
    await prisma.person.upsert({
      where: { employeeId: person.employeeId },
      update: {},
      create: {
        ...person,
        emergencycontact: emergencyContacts,
      },
    });
  }

  console.log('创建演示人员:', demoPersons.length, '个');

  const occupiedRooms = await prisma.room.findMany({
    where: { buildingId: building1.id },
    take: 6,
  });

  for (const room of occupiedRooms) {
    await prisma.room.update({
      where: { id: room.id },
      data: { status: 'OCCUPIED' },
    });
  }

  console.log('更新房间状态: 已占用', occupiedRooms.length, '个');

  // ======== 7S检查违规分类数据 ========
  const violationCategories = [
    { name: '卫生问题', description: '房间脏乱、垃圾未及时清理、衣物乱扔等', sortOrder: 1 },
    { name: '安全隐患', description: '违规使用大功率电器、存放易燃易爆物品等', sortOrder: 2 },
    { name: '物品乱放', description: '私人物品占用公共区域、阻塞通道等', sortOrder: 3 },
    { name: '噪音扰民', description: '大声喧哗、使用音响设备影响他人休息等', sortOrder: 4 },
    { name: '违规用电', description: '私拉电线、违规充电、使用非标插座等', sortOrder: 5 },
  ];

  for (const cat of violationCategories) {
    await prisma.violationCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
  }

  console.log('创建违规分类:', violationCategories.length, '个');

  // 获取已创建的分类和人员
  const categories = await prisma.violationCategory.findMany();
  const categoryMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // ======== 7S检查记录数据 ========
  // 多次违规人员: 张三(3次)、李四(2次)、王五(1次)
  const inspectionRecords = [
    // 张三的3次违规记录
    {
      inspectionDate: new Date('2025-01-15'),
      roomNumber: '101',
      factory: 'imcn',
      department: '技术部',
      personName: '张三',
      categoryId: categoryMap['卫生问题'],
      violationDesc: '房间地面有垃圾，床铺未整理，鞋子乱放',
      action: '口头警告',
      inspector: '王主任',
    },
    {
      inspectionDate: new Date('2025-02-20'),
      roomNumber: '101',
      factory: 'imcn',
      department: '技术部',
      personName: '张三',
      categoryId: categoryMap['违规用电'],
      violationDesc: '使用大功率电吹风，私拉接线板',
      action: '书面警告',
      inspector: '李管理员',
    },
    {
      inspectionDate: new Date('2025-03-10'),
      roomNumber: '101',
      factory: 'imft',
      department: '技术部',
      personName: '张三',
      categoryId: categoryMap['物品乱放'],
      violationDesc: '在走廊堆放私人物品，阻塞消防通道',
      action: '扣分处理',
      inspector: '张队长',
    },
    // 李四的2次违规记录
    {
      inspectionDate: new Date('2025-01-22'),
      roomNumber: '102',
      factory: 'imaw',
      department: '人事部',
      personName: '李四',
      categoryId: categoryMap['噪音扰民'],
      violationDesc: '深夜大声播放音乐，影响隔壁房间休息',
      action: '口头警告',
      inspector: '王主任',
    },
    {
      inspectionDate: new Date('2025-03-05'),
      roomNumber: '102',
      factory: 'imaw',
      department: '人事部',
      personName: '李四',
      categoryId: categoryMap['安全隐患'],
      violationDesc: '在房间内存放电动车电池充电',
      action: '书面警告',
      inspector: '李管理员',
    },
    // 王五的1次违规记录
    {
      inspectionDate: new Date('2025-02-28'),
      roomNumber: '103',
      factory: 'imcn',
      department: '财务部',
      personName: '王五',
      categoryId: categoryMap['卫生问题'],
      violationDesc: '房间异味严重，垃圾堆积未清理',
      action: '口头警告',
      inspector: '张队长',
    },
    // 其他人员违规记录
    {
      inspectionDate: new Date('2025-01-18'),
      roomNumber: '104',
      factory: 'imft',
      department: '市场部',
      personName: '赵六',
      categoryId: categoryMap['物品乱放'],
      violationDesc: '在门口摆放鞋柜和大量鞋子',
      action: '口头警告',
      inspector: '王主任',
    },
    {
      inspectionDate: new Date('2025-02-10'),
      roomNumber: '105',
      factory: 'imcn',
      department: '技术部',
      personName: '钱七',
      categoryId: categoryMap['违规用电'],
      violationDesc: '使用非标插座，多个电器同时使用',
      action: '口头警告',
      inspector: '李管理员',
    },
    {
      inspectionDate: new Date('2025-03-12'),
      roomNumber: '106',
      factory: 'imaw',
      department: '技术部',
      personName: '孙八',
      categoryId: categoryMap['安全隐患'],
      violationDesc: '使用热得快烧水，存在火灾隐患',
      action: '扣分处理',
      inspector: '张队长',
    },
    {
      inspectionDate: new Date('2025-01-25'),
      roomNumber: '107',
      factory: 'imft',
      department: '行政部',
      personName: '周九',
      categoryId: categoryMap['噪音扰民'],
      violationDesc: '大声唱歌、聚会，影响周围住户',
      action: '书面警告',
      inspector: '王主任',
    },
    {
      inspectionDate: new Date('2025-02-15'),
      roomNumber: '108',
      factory: 'imcn',
      department: '销售部',
      personName: '吴十',
      categoryId: categoryMap['卫生问题'],
      violationDesc: '房间内有烟头，卫生间未清洁',
      action: '口头警告',
      inspector: '李管理员',
    },
    {
      inspectionDate: new Date('2025-03-08'),
      roomNumber: '109',
      factory: 'imaw',
      department: '技术部',
      personName: '郑十一',
      categoryId: categoryMap['物品乱放'],
      violationDesc: '在消防通道堆放纸箱和杂物',
      action: '扣分处理',
      inspector: '张队长',
    },
    {
      inspectionDate: new Date('2025-03-15'),
      roomNumber: '110',
      factory: 'imft',
      department: '技术部',
      personName: '陈十二',
      categoryId: categoryMap['违规用电'],
      violationDesc: '违规使用电磁炉做饭',
      action: '书面警告',
      inspector: '王主任',
    },
  ];

  for (const record of inspectionRecords) {
    await prisma.inspectionRecord.create({
      data: record,
    });
  }

  console.log('创建检查记录:', inspectionRecords.length, '条');

  console.log('数据库初始化完成！');
  console.log('登录账号: admin / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
