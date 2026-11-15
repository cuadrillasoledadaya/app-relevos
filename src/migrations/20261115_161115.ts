import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_costaleros_rol" AS ENUM('patero-izquierdo', 'patero-derecho', 'fijador-izquierdo', 'fijador-derecho', 'corriente');
  CREATE TYPE "public"."enum_relevos_tramos_asignaciones_puesto" AS ENUM('patero-izquierdo', 'patero-derecho', 'fijador-izquierdo', 'fijador-derecho', 'corriente');
  CREATE TYPE "public"."enum_relevos_tramos_estado" AS ENUM('planificado', 'en_curso', 'completado', 'omitido');
  CREATE TYPE "public"."enum_fijaciones_estado" AS ENUM('dentro', 'fuera');
  CREATE TABLE "relevos_tramos_asignaciones" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"costalero_id" integer NOT NULL,
  	"trabajadora_id" varchar NOT NULL,
  	"puesto" "enum_relevos_tramos_asignaciones_puesto" NOT NULL
  );
  
  CREATE TABLE "relevos_tramos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"orden" numeric NOT NULL,
  	"punto_id" integer,
  	"estado" "enum_relevos_tramos_estado" DEFAULT 'planificado'
  );
  
  CREATE TABLE "fijaciones" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"paso_id" integer NOT NULL,
  	"costalero_id" integer NOT NULL,
  	"tramo" numeric NOT NULL,
  	"estado" "enum_fijaciones_estado" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "relevos_asignaciones" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "relevos_asignaciones" CASCADE;
  ALTER TABLE "relevos" DROP CONSTRAINT "relevos_punto_id_puntos_de_relevo_id_fk";
  
  ALTER TABLE "relevos" DROP CONSTRAINT "relevos_cuadrilla_entrante_id_cuadrillas_id_fk";
  
  ALTER TABLE "relevos" DROP CONSTRAINT "relevos_cuadrilla_saliente_id_cuadrillas_id_fk";
  
  DROP INDEX "relevos_punto_idx";
  DROP INDEX "relevos_cuadrilla_entrante_idx";
  DROP INDEX "relevos_cuadrilla_saliente_idx";
  ALTER TABLE "costaleros" ADD COLUMN "trabajadora_id" varchar NOT NULL;
  ALTER TABLE "costaleros" ADD COLUMN "rol" "enum_costaleros_rol" NOT NULL;
  ALTER TABLE "pasos_trabajadoras" ADD COLUMN "tramos" numeric DEFAULT 12 NOT NULL;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "fijaciones_find" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "fijaciones_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "fijaciones_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "fijaciones_delete" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fijaciones_id" integer;
  ALTER TABLE "relevos_tramos_asignaciones" ADD CONSTRAINT "relevos_tramos_asignaciones_costalero_id_costaleros_id_fk" FOREIGN KEY ("costalero_id") REFERENCES "public"."costaleros"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos_tramos_asignaciones" ADD CONSTRAINT "relevos_tramos_asignaciones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."relevos_tramos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "relevos_tramos" ADD CONSTRAINT "relevos_tramos_punto_id_puntos_de_relevo_id_fk" FOREIGN KEY ("punto_id") REFERENCES "public"."puntos_de_relevo"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos_tramos" ADD CONSTRAINT "relevos_tramos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."relevos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "fijaciones" ADD CONSTRAINT "fijaciones_paso_id_pasos_id_fk" FOREIGN KEY ("paso_id") REFERENCES "public"."pasos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fijaciones" ADD CONSTRAINT "fijaciones_costalero_id_costaleros_id_fk" FOREIGN KEY ("costalero_id") REFERENCES "public"."costaleros"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "relevos_tramos_asignaciones_order_idx" ON "relevos_tramos_asignaciones" USING btree ("_order");
  CREATE INDEX "relevos_tramos_asignaciones_parent_id_idx" ON "relevos_tramos_asignaciones" USING btree ("_parent_id");
  CREATE INDEX "relevos_tramos_asignaciones_costalero_idx" ON "relevos_tramos_asignaciones" USING btree ("costalero_id");
  CREATE INDEX "relevos_tramos_order_idx" ON "relevos_tramos" USING btree ("_order");
  CREATE INDEX "relevos_tramos_parent_id_idx" ON "relevos_tramos" USING btree ("_parent_id");
  CREATE INDEX "relevos_tramos_punto_idx" ON "relevos_tramos" USING btree ("punto_id");
  CREATE INDEX "fijaciones_paso_idx" ON "fijaciones" USING btree ("paso_id");
  CREATE INDEX "fijaciones_costalero_idx" ON "fijaciones" USING btree ("costalero_id");
  CREATE INDEX "fijaciones_updated_at_idx" ON "fijaciones" USING btree ("updated_at");
  CREATE INDEX "fijaciones_created_at_idx" ON "fijaciones" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fijaciones_fk" FOREIGN KEY ("fijaciones_id") REFERENCES "public"."fijaciones"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_fijaciones_id_idx" ON "payload_locked_documents_rels" USING btree ("fijaciones_id");
  ALTER TABLE "pasos_trabajadoras" DROP COLUMN "tipo";
  ALTER TABLE "relevos" DROP COLUMN "orden";
  ALTER TABLE "relevos" DROP COLUMN "punto_id";
  ALTER TABLE "relevos" DROP COLUMN "cuadrilla_entrante_id";
  ALTER TABLE "relevos" DROP COLUMN "cuadrilla_saliente_id";
  ALTER TABLE "relevos" DROP COLUMN "estado";
  DROP TYPE "public"."enum_pasos_trabajadoras_tipo";
  DROP TYPE "public"."enum_relevos_estado";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pasos_trabajadoras_tipo" AS ENUM('centro', 'cruz', 'tambor', 'puesto');
  CREATE TYPE "public"."enum_relevos_estado" AS ENUM('planificado', 'en_curso', 'completado', 'omitido');
  CREATE TABLE "relevos_asignaciones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"costalero_id" integer NOT NULL,
  	"trabajadera_id" varchar NOT NULL
  );
  
  ALTER TABLE "relevos_tramos_asignaciones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "relevos_tramos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "fijaciones" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "relevos_tramos_asignaciones" CASCADE;
  DROP TABLE "relevos_tramos" CASCADE;
  DROP TABLE "fijaciones" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fijaciones_fk";
  
  DROP INDEX "payload_locked_documents_rels_fijaciones_id_idx";
  ALTER TABLE "pasos_trabajadoras" ADD COLUMN "tipo" "enum_pasos_trabajadoras_tipo" NOT NULL;
  ALTER TABLE "relevos" ADD COLUMN "orden" numeric NOT NULL;
  ALTER TABLE "relevos" ADD COLUMN "punto_id" integer NOT NULL;
  ALTER TABLE "relevos" ADD COLUMN "cuadrilla_entrante_id" integer NOT NULL;
  ALTER TABLE "relevos" ADD COLUMN "cuadrilla_saliente_id" integer;
  ALTER TABLE "relevos" ADD COLUMN "estado" "enum_relevos_estado" DEFAULT 'planificado';
  ALTER TABLE "relevos_asignaciones" ADD CONSTRAINT "relevos_asignaciones_costalero_id_costaleros_id_fk" FOREIGN KEY ("costalero_id") REFERENCES "public"."costaleros"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos_asignaciones" ADD CONSTRAINT "relevos_asignaciones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."relevos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "relevos_asignaciones_order_idx" ON "relevos_asignaciones" USING btree ("_order");
  CREATE INDEX "relevos_asignaciones_parent_id_idx" ON "relevos_asignaciones" USING btree ("_parent_id");
  CREATE INDEX "relevos_asignaciones_costalero_idx" ON "relevos_asignaciones" USING btree ("costalero_id");
  ALTER TABLE "relevos" ADD CONSTRAINT "relevos_punto_id_puntos_de_relevo_id_fk" FOREIGN KEY ("punto_id") REFERENCES "public"."puntos_de_relevo"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos" ADD CONSTRAINT "relevos_cuadrilla_entrante_id_cuadrillas_id_fk" FOREIGN KEY ("cuadrilla_entrante_id") REFERENCES "public"."cuadrillas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "relevos" ADD CONSTRAINT "relevos_cuadrilla_saliente_id_cuadrillas_id_fk" FOREIGN KEY ("cuadrilla_saliente_id") REFERENCES "public"."cuadrillas"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "relevos_punto_idx" ON "relevos" USING btree ("punto_id");
  CREATE INDEX "relevos_cuadrilla_entrante_idx" ON "relevos" USING btree ("cuadrilla_entrante_id");
  CREATE INDEX "relevos_cuadrilla_saliente_idx" ON "relevos" USING btree ("cuadrilla_saliente_id");
  ALTER TABLE "costaleros" DROP COLUMN "trabajadora_id";
  ALTER TABLE "costaleros" DROP COLUMN "rol";
  ALTER TABLE "pasos_trabajadoras" DROP COLUMN "tramos";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "fijaciones_find";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "fijaciones_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "fijaciones_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "fijaciones_delete";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fijaciones_id";
  DROP TYPE "public"."enum_costaleros_rol";
  DROP TYPE "public"."enum_relevos_tramos_asignaciones_puesto";
  DROP TYPE "public"."enum_relevos_tramos_estado";
  DROP TYPE "public"."enum_fijaciones_estado";`)
}
