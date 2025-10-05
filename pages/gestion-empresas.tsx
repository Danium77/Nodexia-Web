import { GetServerSideProps } from 'next';
import AdminLayout from '../components/layout/AdminLayout';
import GestionEmpresasReal from '../components/Admin/GestionEmpresasReal';

export default function GestionEmpresas() {
  return (
    <AdminLayout pageTitle="Gestión de Empresas">
      <GestionEmpresasReal />
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {},
  };
};