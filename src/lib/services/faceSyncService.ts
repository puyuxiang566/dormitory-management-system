/**
 * 人脸同步服务
 * 负责人员档案与人脸库的自动同步
 */

import { prisma } from '../prisma'

export interface FaceSyncResult {
  success: boolean
  faceRecordId?: number
  error?: string
}

export interface CreateFaceRecordParams {
  personId: number
  faceData: string
  captureMethod?: 'ON_SITE' | 'APP_UPLOAD' | 'MANUAL_INPUT'
  autoAssignPermission?: boolean
}

/**
 * 为人员创建人脸记录
 */
export async function createFaceRecordForPerson(
  params: CreateFaceRecordParams
): Promise<FaceSyncResult> {
  try {
    const { personId, faceData, captureMethod = 'MANUAL_INPUT', autoAssignPermission = true } = params

    // 检查人员是否存在
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: { building: true },
    })

    if (!person) {
      return { success: false, error: '人员不存在' }
    }

    // 检查是否已有活跃的人脸记录
    const existingRecord = await prisma.faceRecord.findFirst({
      where: { personId, isActive: true },
    })

    if (existingRecord) {
      return { success: false, error: '该人员已有活跃的人脸记录' }
    }

    let permissionGroupId: number | null = null

    // 自动分配权限组
    if (autoAssignPermission && person.buildingId) {
      // 查找或创建对应楼栋的权限组
      let permissionGroup = await prisma.permissionGroup.findFirst({
        where: { buildingId: person.buildingId },
      })

      if (!permissionGroup) {
        // 创建权限组
        permissionGroup = await prisma.permissionGroup.create({
          data: {
            name: `${person.building?.name || '楼栋'}通行权限`,
            buildingId: person.buildingId,
            description: `自动创建的${person.building?.name}通行权限组`,
          },
        })
      }

      permissionGroupId = permissionGroup.id
    }

    // 创建人脸记录
    const faceRecord = await prisma.faceRecord.create({
      data: {
        personId,
        faceData,
        captureMethod,
        permissionGroupId,
        isActive: true,
        isTemporary: false,
      },
    })

    return { success: true, faceRecordId: faceRecord.id }
  } catch (error) {
    console.error('创建人脸记录失败:', error)
    return { success: false, error: '创建人脸记录时发生错误' }
  }
}

/**
 * 为访客创建临时人脸记录
 */
export async function createTemporaryFaceRecordForVisitor(
  visitorId: number,
  faceData: string,
  expiresAt: Date
): Promise<FaceSyncResult> {
  try {
    // 检查访客是否存在
    const visitor = await prisma.visitor.findUnique({
      where: { id: visitorId },
      include: { person: { include: { building: true } } },
    })

    if (!visitor) {
      return { success: false, error: '访客不存在' }
    }

    let permissionGroupId: number | null = null

    // 根据被访员工的楼栋分配权限组
    if (visitor.person?.buildingId) {
      let permissionGroup = await prisma.permissionGroup.findFirst({
        where: { buildingId: visitor.person.buildingId },
      })

      if (!permissionGroup && visitor.person.building) {
        permissionGroup = await prisma.permissionGroup.create({
          data: {
            name: `${visitor.person.building.name}访客通行权限`,
            buildingId: visitor.person.buildingId,
            description: `${visitor.person.building.name}访客临时通行权限组`,
          },
        })
      }

      permissionGroupId = permissionGroup?.id || null
    }

    // 创建临时人脸记录
    const faceRecord = await prisma.faceRecord.create({
      data: {
        visitorId,
        faceData,
        permissionGroupId,
        captureMethod: 'MANUAL_INPUT',
        expiresAt,
        isTemporary: true,
        isActive: true,
      },
    })

    return { success: true, faceRecordId: faceRecord.id }
  } catch (error) {
    console.error('创建访客人脸记录失败:', error)
    return { success: false, error: '创建访客人脸记录时发生错误' }
  }
}

/**
 * 更新人员权限组（当人员调房时）
 */
export async function updatePersonPermissionGroup(
  personId: number,
  newBuildingId: number
): Promise<boolean> {
  try {
    // 查找新楼栋的权限组
    let permissionGroup = await prisma.permissionGroup.findFirst({
      where: { buildingId: newBuildingId },
    })

    const building = await prisma.building.findUnique({
      where: { id: newBuildingId },
    })

    if (!permissionGroup && building) {
      // 创建权限组
      permissionGroup = await prisma.permissionGroup.create({
        data: {
          name: `${building.name}通行权限`,
          buildingId: newBuildingId,
          description: `自动创建的${building.name}通行权限组`,
        },
      })
    }

    if (permissionGroup) {
      // 更新该人员的人脸记录权限组
      await prisma.faceRecord.updateMany({
        where: { personId, isActive: true },
        data: { permissionGroupId: permissionGroup.id },
      })
    }

    return true
  } catch (error) {
    console.error('更新权限组失败:', error)
    return false
  }
}

/**
 * 禁用人员人脸记录（当人员退宿或加入黑名单时）
 */
export async function disablePersonFaceRecords(personId: number): Promise<boolean> {
  try {
    await prisma.faceRecord.updateMany({
      where: { personId, isActive: true },
      data: { isActive: false },
    })
    return true
  } catch (error) {
    console.error('禁用人脸记录失败:', error)
    return false
  }
}

/**
 * 清理过期的临时人脸权限
 */
export async function cleanupExpiredTemporaryAccess(): Promise<number> {
  try {
    const result = await prisma.faceRecord.updateMany({
      where: {
        isTemporary: true,
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    })
    return result.count
  } catch (error) {
    console.error('清理过期权限失败:', error)
    return 0
  }
}
