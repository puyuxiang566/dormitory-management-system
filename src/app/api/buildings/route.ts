import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exportFlag = searchParams.get('export');

    // 导出模式
    if (exportFlag === 'true') {
      const buildings = await prisma.building.findMany({
        include: {
          room: {
            orderBy: [
              { floorNumber: 'asc' },
              { roomNumber: 'asc' },
            ],
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      // 构建导出数据
      const exportData: Array<Record<string, string | number>> = [];

      for (const building of buildings) {
        for (const room of building.room) {
          exportData.push({
            '楼栋名称': building.name,
            '规划楼层数': building.floors,
            '位置描述': building.address || '',
            '备注说明': building.description || '',
            '房间号': room.roomNumber,
            '所在楼层': room.floorNumber,
            '床位数量': room.bedCount,
          });
        }
      }

      // 创建工作簿和工作表
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '楼栋房间信息');

      // 生成 Buffer
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

      // 生成文件名
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `楼栋房间信息_${dateStr}.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }

    // 普通查询模式
    const buildings = await prisma.building.findMany({
      include: {
        room: {
          include: {
            person: {
              where: { status: 'ACTIVE' },
              select: { id: true, name: true, gender: true, employeeId: true, department: true, factory: true },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json({ data: buildings });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buildings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // 导入模式：FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'No file uploaded' },
          { status: 400 }
        );
      }

      // 解析 Excel 文件
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, unknown>>;

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // 按楼栋名称分组处理
      const buildingMap = new Map<string, Array<Record<string, unknown>>>();

      for (const row of jsonData) {
        const name = row['楼栋名称'] as string;
        if (!name) {
          errors.push('缺少楼栋名称');
          failed++;
          continue;
        }

        if (!buildingMap.has(name)) {
          buildingMap.set(name, []);
        }
        buildingMap.get(name)!.push(row);
      }

      // 处理每个楼栋
      for (const [buildingName, rooms] of buildingMap) {
        try {
          // 查找或创建楼栋
          let building = await prisma.building.findUnique({
            where: { name: buildingName },
          });

          if (!building) {
            // 创建新楼栋
            const firstRoom = rooms[0];
            building = await prisma.building.create({
              data: {
                name: buildingName,
                floors: Number(firstRoom['规划楼层数']) || 1,
                address: firstRoom['位置描述'] ? String(firstRoom['位置描述']) : '',
                description: firstRoom['备注说明'] ? String(firstRoom['备注说明']) : '',
              },
            });
          } else {
            // 更新现有楼栋
            const firstRoom = rooms[0];
            building = await prisma.building.update({
              where: { id: building.id },
              data: {
                floors: Number(firstRoom['规划楼层数']) || building.floors,
                address: firstRoom['位置描述'] ? String(firstRoom['位置描述']) : building.address,
                description: firstRoom['备注说明'] ? String(firstRoom['备注说明']) : building.description,
              },
            });
          }

          // 处理房间
          for (const roomData of rooms) {
            const roomNumberRaw = roomData['房间号'];
            const roomNumber = roomNumberRaw ? String(roomNumberRaw) : '';
            if (!roomNumber) {
              errors.push(`楼栋 ${buildingName} 缺少房间号`);
              failed++;
              continue;
            }

            const floorNumberRaw = roomData['所在楼层'];
            const floorNumber = floorNumberRaw ? Number(floorNumberRaw) : 1;
            const bedCountRaw = roomData['床位数量'];
            const bedCount = bedCountRaw ? Number(bedCountRaw) : 1;

            // 查找或创建房间（状态根据入住情况自动匹配）
            const existingRoom = await prisma.room.findUnique({
              where: {
                buildingId_roomNumber: {
                  buildingId: building.id,
                  roomNumber: roomNumber,
                },
              },
            });

            if (existingRoom) {
              // 更新房间（不设置状态，让系统自动匹配）
              await prisma.room.update({
                where: { id: existingRoom.id },
                data: {
                  floorNumber,
                  bedCount,
                },
              });
            } else {
              // 创建房间（状态默认 VACANT）
              await prisma.room.create({
                data: {
                  buildingId: building.id,
                  floorNumber,
                  roomNumber,
                  bedCount,
                },
              });
            }
            success++;
          }
        } catch (err) {
          console.error(`Error processing building ${buildingName}:`, err);
          errors.push(`处理楼栋 ${buildingName} 失败: ${(err as Error).message}`);
          failed++;
        }
      }

      return NextResponse.json({
        success,
        failed,
        errors,
      });
    }

    // 普通创建模式：JSON
    const body = await request.json();
    const { name, description, address, floors, roomsPerFloor, bedsPerRoom } = body;

    console.log('Received body:', JSON.stringify(body));
    console.log('floors:', floors, 'roomsPerFloor:', roomsPerFloor, 'bedsPerRoom:', bedsPerRoom);

    const floorsNum = parseInt(floors);
    const roomsPerFloorNum = parseInt(roomsPerFloor);
    const bedsPerRoomNum = parseInt(bedsPerRoom);

    console.log('Parsed values - floorsNum:', floorsNum, 'roomsPerFloorNum:', roomsPerFloorNum, 'bedsPerRoomNum:', bedsPerRoomNum);

    const roomsData = [];
    if (roomsPerFloorNum > 0 && bedsPerRoomNum > 0 && floorsNum > 0) {
      for (let floor = 1; floor <= floorsNum; floor++) {
        for (let roomIndex = 1; roomIndex <= roomsPerFloorNum; roomIndex++) {
          const roomNumber = `8${floor}${roomIndex.toString().padStart(2, '0')}`;
          roomsData.push({
            floorNumber: floor,
            roomNumber: roomNumber,
            bedCount: bedsPerRoomNum,
            status: 'VACANT',
          });
        }
      }
    }

    console.log('roomsData length:', roomsData.length);
    console.log('roomsData sample:', roomsData.slice(0, 3));

    const building = await prisma.building.create({
      data: {
        name,
        description,
        address,
        floors: floorsNum,
        ...(roomsData.length > 0 && {
          room: {
            create: roomsData,
          },
        }),
      },
      include: {
        room: true,
      }
    });

    console.log('Created building:', JSON.stringify(building));
    return NextResponse.json(building, { status: 201 });
  } catch (error) {
    console.error('Error creating building:', error);
    return NextResponse.json(
      { error: 'Failed to create building' },
      { status: 500 }
    );
  }
}
