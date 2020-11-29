import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Constants } from '../../../CommonsModule/constants';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CourseTakenV2Service } from '../../service/v2/course-taken-v2.service';
import { CourseTaken } from '../../entity/course-taken.entity';
import { CurrentStepDTO } from '../../dto/current-step.dto';
import { NewCourseTakenDTO } from '../../dto/new-course.taken.dto';
import { NeedRole } from '../../../CommonsModule/guard/role-metadata.guard';
import { RoleEnum } from '../../../SecurityModule/enum/role.enum';
import { RoleGuard } from '../../../CommonsModule/guard/role.guard';

@ApiTags('CourseTakenV2')
@ApiBearerAuth()
@Controller(
  `${Constants.API_PREFIX}/${Constants.API_VERSION_2}/${Constants.COURSE_TAKEN_ENDPOINT}`,
)
export class CourseTakenV2Controller {
  constructor(private readonly service: CourseTakenV2Service) {}

  @Get('/user/:userId')
  @NeedRole(RoleEnum.STUDENT)
  @UseGuards(RoleGuard)
  public async getAll(@Param('userId') userId: string): Promise<CourseTaken[]> {
    return this.service.getAllByUserId(userId);
  }

  @Post('start-course')
  @NeedRole(RoleEnum.STUDENT)
  @UseGuards(RoleGuard)
  public async startCourse(
    @Body() { userId, courseId }: NewCourseTakenDTO,
  ): Promise<void> {
    await this.service.startCourse(userId, courseId);
  }

  @Post('advance-on-course/user/:userId/course/:courseId')
  @NeedRole(RoleEnum.STUDENT)
  @UseGuards(RoleGuard)
  public async updateCourseStatus(
    @Param('userId') userId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<void> {
    await this.service.advanceOnCourse(userId, courseId);
  }

  @Get('current-step/user/:userId/course/:courseId')
  @NeedRole(RoleEnum.STUDENT)
  @UseGuards(RoleGuard)
  public async currentStep(
    @Param('userId') userId: string,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<CurrentStepDTO> {
    return await this.service.currentStep(userId, courseId);
  }

  @Get('certificate/user/:userId')
  @NeedRole(RoleEnum.STUDENT)
  @UseGuards(RoleGuard)
  public async certificates(@Param('userId') userId: string) {
    return await this.service.certificates(userId);
  }
}