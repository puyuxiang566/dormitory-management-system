import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      roomCounts,
      personCounts,
      activePersonCounts,
      genderCounts,
      roomStatusCounts,
      totalBeds,
      roomsWithBuilding,
    ] = await Promise.all([
      prisma.room.count(),
      prisma.person.count(),
      prisma.person.count({ where: { status: 'ACTIVE' } }),
      prisma.person.groupBy({
        by: ['gender'],
        where: { status: 'ACTIVE' },
        _count: { gender: true },
      }),
      prisma.room.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      // 只统计非关闭状态房间的床位数
      prisma.room.aggregate({
        _sum: { bedCount: true },
        where: { status: { not: 'CLOSED' } },
      }),
      prisma.room.findMany({
        select: {
          bedCount: true,
          floorNumber: true,
          building: { select: { name: true } },
          person: { where: { status: 'ACTIVE' }, select: { gender: true } },
        },
      }),
    ]);

    const occupiedBeds = activePersonCounts;
    const totalBedsCount = totalBeds._sum.bedCount || 0;
    const vacantBeds = totalBedsCount - occupiedBeds;
    const occupancyRate = totalBedsCount > 0 ? ((occupiedBeds / totalBedsCount) * 100).toFixed(1) : '0';

    const genderStats = {
      male: genderCounts.find(g => g.gender === '男')?._count?.gender ?? 0,
      female: genderCounts.find(g => g.gender === '女')?._count?.gender ?? 0,
      unknown: genderCounts.find(g => !g.gender)?._count?.gender ?? 0,
    };

    const floorStats: { [key: string]: { total: number; occupied: number; male: number; female: number } } = {};
    roomsWithBuilding.forEach(room => {
      const floorKey = `${room.building.name}-${room.floorNumber}楼`;
      if (!floorStats[floorKey]) {
        floorStats[floorKey] = { total: 0, occupied: 0, male: 0, female: 0 };
      }
      floorStats[floorKey].total += room.bedCount;
      floorStats[floorKey].occupied += room.person.length;
      room.person.forEach(p => {
        if (p.gender === '男') floorStats[floorKey].male++;
        else if (p.gender === '女') floorStats[floorKey].female++;
      });
    });

    const roomStatusStats = {
      total: roomCounts,
      occupied: roomStatusCounts.find(r => r.status === 'OCCUPIED')?._count?.status ?? 0,
      vacant: roomStatusCounts.find(r => r.status === 'VACANT')?._count?.status ?? 0,
      maintenance: roomStatusCounts.find(r => r.status === 'MAINTENANCE')?._count?.status ?? 0,
    };

    // 计算房间统计数据
    // 已用房间数：有人员入住的房间（person.length > 0）
    const usedRooms = roomsWithBuilding.filter(r => r.person.length > 0).length;
    // 可用房间数：除已关闭（CLOSED）以外的所有房间
    const closedRooms = roomStatusCounts.find(r => r.status === 'CLOSED')?._count?.status ?? 0;
    const availableRooms = roomCounts - closedRooms;
    // 房间利用率：可用房间数 / 总房间数
    const roomUtilizationRate = roomCounts > 0 ? ((availableRooms / roomCounts) * 100).toFixed(1) : '0';

    const personStatusCounts = await prisma.person.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const personStatusStats = {
      active: personStatusCounts.find(p => p.status === 'ACTIVE')?._count?.status ?? 0,
      movedOut: personStatusCounts.find(p => p.status === 'MOVED_OUT')?._count?.status ?? 0,
      blacklisted: personStatusCounts.find(p => p.status === 'BLACKLISTED')?._count?.status ?? 0,
    };

    const turnoverRate = personStatusStats.active > 0 
      ? ((personStatusStats.movedOut / personStatusStats.active) * 100).toFixed(1)
      : '0';

    const buildingCount = await prisma.building.count();

    return NextResponse.json({
      data: {
        bedStats: {
          totalBeds: totalBedsCount,
          occupiedBeds,
          vacantBeds,
          occupancyRate,
          vacancyRate: (100 - parseFloat(occupancyRate)).toFixed(1),
        },
        roomStats: {
          totalRooms: roomCounts,
          usedRooms,
          availableRooms,
          closedRooms,
          roomUtilizationRate,
        },
        genderStats,
        floorStats,
        roomStatusStats,
        personStatusStats,
        turnoverRate,
        totalPersons: personCounts,
        totalBuildings: buildingCount,
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
