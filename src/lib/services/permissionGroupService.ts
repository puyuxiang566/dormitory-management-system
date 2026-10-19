/**
 * 权限分组服务
 * 负责通行权限的智能分组管理
 */

import { prisma } from '../prisma'

export interface PermissionGroupInfo {
  id: number
  name: string
  description?: string | null
  buildingId?: number | null
  buildingName?: string | null
  memberCount: number
  createdAt: Date
}

export interface CreatePermissionGroupParams {
  name: string
  description?: string
  buildingId?: number
}

export interface AssignPermissionParams {
  faceRecordId: number
  permissionGroupId: number
}

/**
 * 获取所有权限组
 */
export async function getAllPermissionGroups(): Promise<PermissionGroupInfo[]> {
  try {
    const groups = await prisma.permissionGroup.findMany({
      include: {
        building: true,
        _count: {
          select: { facerecord: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      buildingId: group.buildingId,
      buildingName: group.building?.name,
      memberCount: group._count.facerecord,
      createdAt: group.createdAt,
    }))
  } catch (error) {
    console.error('获取权限组列表失败:', error)
    return []
  }
}

/**
 * 创建权限组
 */
export async function createPermissionGroup(
  params: CreatePermissionGroupParams
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const { name, description, buildingId } = params

    // 检查权限组名称是否已存在
    const existing = await prisma.permissionGroup.findFirst({
      where: { name },
    })

    if (existing) {
      return { success: false, error: '权限组名称已存在' }
    }

    const group = await prisma.permissionGroup.create({
      data: {
        name,
        description,
        buildingId,
      },
    })

    return { success: true, id: group.id }
  } catch (error) {
    console.error('创建权限组失败:', error)
    return { success: false, error: '创建权限组时发生错误' }
  }
}

/**
 * 更新权限组
 */
export async function updatePermissionGroup(
  id: number,
  params: Partial<CreatePermissionGroupParams>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { name, description, buildingId } = params

    // 检查权限组是否存在
    const existing = await prisma.permissionGroup.findUnique({
      where: { id },
    })

    if (!existing) {
      return { success: false, error: '权限组不存在' }
    }

    // 如果要修改名称，检查新名称是否已存在
    if (name && name !== existing.name) {
      const duplicateName = await prisma.permissionGroup.findFirst({
        where: { name, id: { not: id } },
      })

      if (duplicateName) {
        return { success: false, error: '权限组名称已存在' }
      }
    }

    await prisma.permissionGroup.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(buildingId !== undefined && { buildingId }),
      },
    })

    return { success: true }
  } catch (error) {
    console.error('更新权限组失败:', error)
    return { success: false, error: '更新权限组时发生错误' }
  }
}

/**
 * 删除权限组
 */
export async function deletePermissionGroup(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 检查是否有成员
    const memberCount = await prisma.faceRecord.count({
      where: { permissionGroupId: id },
    })

    if (memberCount > 0) {
      return { success: false, error: '该权限组还有成员，无法删除' }
    }

    await prisma.permissionGroup.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error('删除权限组失败:', error)
    return { success: false, error: '删除权限组时发生错误' }
  }
}

/**
 * 为人脸记录分配权限组
 */
export async function assignPermissionToFaceRecord(
  params: AssignPermissionParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { faceRecordId, permissionGroupId } = params

    // 检查人脸记录是否存在
    const faceRecord = await prisma.faceRecord.findUnique({
      where: { id: faceRecordId },
    })

    if (!faceRecord) {
      return { success: false, error: '人脸记录不存在' }
    }

    // 检查权限组是否存在
    const permissionGroup = await prisma.permissionGroup.findUnique({
      where: { id: permissionGroupId },
    })

    if (!permissionGroup) {
      return { success: false, error: '权限组不存在' }
    }

    await prisma.faceRecord.update({
      where: { id: faceRecordId },
      data: { permissionGroupId },
    })

    return { success: true }
  } catch (error) {
    console.error('分配权限失败:', error)
    return { success: false, error: '分配权限时发生错误' }
  }
}

/**
 * 批量分配权限组（根据楼栋自动分配）
 */
export async function autoAssignPermissionsByBuilding(): Promise<{
  success: boolean
  assignedCount: number
  error?: string
}> {
  try {
    // 获取所有没有权限组的活跃人脸记录
    const faceRecords = await prisma.faceRecord.findMany({
      where: {
        permissionGroupId: null,
        isActive: true,
        person: { isNot: null },
      },
      include: {
        person: {
          include: { building: true },
        },
      },
    })

    let assignedCount = 0

    for (const record of faceRecords) {
      if (record.person?.buildingId) {
        // 查找或创建对应楼栋的权限组
        let permissionGroup = await prisma.permissionGroup.findFirst({
          where: { buildingId: record.person.buildingId },
        })

        if (!permissionGroup && record.person.building) {
          permissionGroup = await prisma.permissionGroup.create({
            data: {
              name: `${record.person.building.name}通行权限`,
              buildingId: record.person.buildingId,
              description: `自动创建的${record.person.building.name}通行权限组`,
            },
          })
        }

        if (permissionGroup) {
          await prisma.faceRecord.update({
            where: { id: record.id },
            data: { permissionGroupId: permissionGroup.id },
          })
          assignedCount++
        }
      }
    }

    return { success: true, assignedCount }
  } catch (error) {
    console.error('批量分配权限失败:', error)
    return { success: false, assignedCount: 0, error: '批量分配权限时发生错误' }
  }
}

/**
 * 获取权限组成员列表
 */
export async function getPermissionGroupMembers(permissionGroupId: number) {
  try {
    const members = await prisma.faceRecord.findMany({
      where: {
        permissionGroupId,
        isActive: true,
      },
      include: {
        person: {
          include: {
            building: true,
            room: true,
          },
        },
        visitor: true,
      },
    })

    return members.map((member) => ({
      faceRecordId: member.id,
      isTemporary: member.isTemporary,
      expiresAt: member.expiresAt,
      captureMethod: member.captureMethod,
      person: member.person
        ? {
            id: member.person.id,
            name: member.person.name,
            employeeId: member.person.employeeId,
            department: member.person.department,
            building: member.person.building?.name,
            room: member.person.room?.roomNumber,
          }
        : null,
      visitor: member.visitor
        ? {
            id: member.visitor.id,
            name: member.visitor.name,
            phone: member.visitor.phone,
          }
        : null,
    }))
  } catch (error) {
    console.error('获取权限组成员失败:', error)
    return []
  }
}
