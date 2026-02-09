'use client';

import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, message, App, Divider, Alert, Space } from 'antd';
import {
    CloudServerOutlined,
    LockOutlined,
} from '@ant-design/icons';
import { companySettingsApi } from '@/lib/api';

export default function CompanySettingsForm() {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await companySettingsApi.get();
            form.setFieldsValue(data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            message.error('Failed to load settings');
        } finally {
            setFetching(false);
        }
    };

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            await companySettingsApi.update(values);
            message.success('Settings updated successfully');
        } catch (error) {
            console.error('Failed to update settings:', error);
            message.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card title="System Settings" loading={fetching}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                >
                    <Divider orientation="left">
                        <Space>
                            <CloudServerOutlined />
                            Cloud Storage Configuration (R2)
                        </Space>
                    </Divider>

                    <Alert
                        message="R2 Storage Connection"
                        description="Configure your Cloudflare R2 or S3 storage here. If left blank, the system will use values from the server's .env file."
                        type="info"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item
                            name="r2_access_key_id"
                            label="Access Key ID"
                        >
                            <Input prefix={<LockOutlined />} placeholder="Enter Access Key" />
                        </Form.Item>

                        <Form.Item
                            name="r2_secret_access_key"
                            label="Secret Access Key"
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Enter Secret Key" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="r2_endpoint"
                        label="S3 Endpoint URL"
                    >
                        <Input placeholder="https://<id>.r2.cloudflarestorage.com" />
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item name="r2_bucket_name" label="Bucket Name">
                            <Input placeholder="nizron" />
                        </Form.Item>

                        <Form.Item
                            name="r2_public_url_prefix"
                            label="Public URL Prefix"
                        >
                            <Input placeholder="https://pub-xxx.r2.dev" />
                        </Form.Item>
                    </div>

                    <Form.Item style={{ marginTop: 24 }}>
                        <Button type="primary" htmlType="submit" loading={loading} block size="large">
                            Save Configuration
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </Space>
    );
}
