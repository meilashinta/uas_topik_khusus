import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return current user profile' })
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Req() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Get()
  @ApiOperation({ summary: 'Get list of users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Return users list' })
  async findAll(@Query() filterDto: UserFilterDto) {
    return this.usersService.findAll(filterDto);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Get(':id')
  @ApiOperation({ summary: 'Get user detail by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Return user detail' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Post()
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Req() req: any, @Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete/deactivate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.usersService.softDelete(id, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Admin force reset password for user' })
  @ApiResponse({ status: 200, description: 'Reset password email sent' })
  async resetPassword(@Req() req: any, @Param('id') id: string) {
    return this.usersService.resetPasswordByAdmin(id, req.user.userId, req);
  }
}
