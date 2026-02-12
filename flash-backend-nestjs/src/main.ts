import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initializeUploadDirectories } from './common/utils/upload.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as express from 'express';

async function bootstrap() {
  // Initialize upload directories
  initializeUploadDirectories();

  const app = await NestFactory.create(AppModule);

  // Increase body size limit for JSON and URL-encoded data
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: true, // During dev, reflect origin
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Nizron ERP API')
    .setDescription('Backend API for Nizron ERP System')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 8000;
  await app.listen(port);
  console.log(`🚀 Nizron ERP Backend running on http://localhost:${port}`);
  console.log(
    `📚 API Documentation available at http://localhost:${port}/docs`,
  );
}

export default bootstrap();
