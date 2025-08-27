import React from 'react';
import TransferForm from './TransferForm';
import MessageForm from './MessageForm';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TransferModule: React.FC = () => {

  return (
    <div className="w-full p-6">
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="transfer" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transfer">转账方式</TabsTrigger>
              <TabsTrigger value="logs">日志方式</TabsTrigger>
            </TabsList>
            
            <div className="p-6">
              <TabsContent value="transfer" className="mt-0">
                <div className="min-h-96">
                  <h3 className="text-lg font-medium mb-6">转账方式</h3>
                  <TransferForm />
                </div>
              </TabsContent>

              <TabsContent value="logs" className="mt-0">
                <div className="min-h-96">
                  <h3 className="text-lg font-medium mb-4">日志方式</h3>
                  <MessageForm />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferModule;