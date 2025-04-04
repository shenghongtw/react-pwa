import React, { useState } from 'react';

import { UploadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Form, Input, Row, Select, Spin, Table, Upload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';

import { Container, Content } from './styled';

// 會員識別結果介面
interface MemberRecognitionResult {
  memberId: string;
  contribution: number;
  imageId?: string; // 新增圖片ID追蹤
}

interface RecordType {
  id: string;
  name: string;
  // 其他属性...
}

const Welcome: React.FC = () => {
  const [fileList1, setFileList1] = useState<UploadFile[]>([]);
  const [fileList2, setFileList2] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();
  const [coinsResults, setCoinsResults] = useState<MemberRecognitionResult[]>([]);
  const [activityResults, setActivityResults] = useState<MemberRecognitionResult[]>([]);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [recognizedMembers, setRecognizedMembers] = useState<
    {
      memberId: string;
      coinsContribution: number;
      activityContribution: number;
      level: string;
    }[]
  >([]);
  const [processingStatus, setProcessingStatus] = useState<{ [key: string]: string }>({});
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  // 初始会员数据（从低到高排序）
  const initialData = [
    {
      key: '1',
      level: '3普寶',
      coins: '300',
      activity: '300',
    },
    {
      key: '2',
      level: '2高寶',
      coins: '1000',
      activity: '1500',
    },
    {
      key: '3',
      level: '1稀寶',
      coins: '3000',
      activity: '3000',
    },
    {
      key: '4',
      level: '2稀寶',
      coins: '5000',
      activity: '6000',
    },
    {
      key: '5',
      level: '至尊',
      coins: '5000',
      activity: '15000',
    },
  ];

  const [memberData, setMemberData] = useState(initialData);

  // 表格数据
  const columns = [
    {
      title: '會員等級',
      dataIndex: 'level',
      key: 'level',
      width: '25%',
    },
    {
      title: '金幣捐獻',
      dataIndex: 'coins',
      key: 'coins',
      width: '37.5%',
      render: (_: any, record: RecordType, index: number) => (
        <Input
          placeholder="請輸入捐獻值"
          value={record.coins}
          onChange={(e) => handleInputChange(index, 'coins', e.target.value)}
        />
      ),
    },
    {
      title: '活躍貢獻',
      dataIndex: 'activity',
      key: 'activity',
      width: '37.5%',
      render: (_: any, record: RecordType, index: number) => (
        <Input
          placeholder="請輸入活躍貢獻"
          value={record.activity}
          onChange={(e) => handleInputChange(index, 'activity', e.target.value)}
        />
      ),
    },
  ];

  // 处理输入值变化
  const handleInputChange = (index: number, field: 'coins' | 'activity', value: string) => {
    const newData = [...memberData];
    newData[index][field] = value;
    setMemberData(newData);
  };

  // 呼叫 Gemini API 的函數
  const callGeminiAPI = async (imageFile: File, prompt: string) => {
    try {
      // 將圖片轉為 base64 字串
      const base64Image = await convertFileToBase64(imageFile);

      // 使用硬編碼的API密鑰或從更安全的位置獲取
      // 注意：在正式環境中，不建議將API密鑰直接寫在前端代碼中
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API密鑰未設置，請檢查環境變量配置');
      }

      // 使用 Gemini API 進行辨識
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gemini-2.0-flash',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.choices || result.choices.length === 0 || !result.choices[0].message) {
        throw new Error('API 回傳資料格式錯誤');
      }

      return result.choices[0].message.content;
    } catch (error) {
      console.error('API call failed:', error);
      message.error(`API 呼叫失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      throw error;
    }
  };

  // 將檔案轉為 base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // 移除 data:image/jpeg;base64, 前綴
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('轉換失敗'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // 解析 API 回應為結構化數據
  const parseApiResponse = (response: string): MemberRecognitionResult[] => {
    try {
      // 清理回應，移除可能的Markdown代碼塊標記
      let cleanedResponse = response;

      // 檢查是否包含```json和```標記，並移除它們
      if (response.startsWith('```json') || response.startsWith('```')) {
        cleanedResponse = response
          .replace(/^```json\n/, '') // 移除開頭的```json
          .replace(/^```\n/, '') // 或移除開頭的```
          .replace(/\n```$/, ''); // 移除結尾的```
      }

      console.log('清理後的回應:', cleanedResponse);

      // 嘗試解析JSON
      const jsonData = JSON.parse(cleanedResponse);
      console.log('成功解析為JSON:', jsonData);

      // 檢查 JSON 格式，如果是返回帶有中文鍵名的數組，需要轉換成我們需要的格式
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        // 檢查第一項是否包含中文鍵名
        const firstItem = jsonData[0];
        if (
          firstItem['會員ID'] !== undefined &&
          (firstItem['金幣捐獻'] !== undefined || firstItem['活躍貢獻'] !== undefined)
        ) {
          // 將中文鍵名轉換為我們的標準格式
          return jsonData.map((item) => ({
            memberId: item['會員ID'] || '',
            contribution:
              typeof item['金幣捐獻'] !== 'undefined'
                ? Number(item['金幣捐獻'])
                : typeof item['活躍貢獻'] !== 'undefined'
                  ? Number(item['活躍貢獻'])
                  : 0,
          }));
        }
      }

      // 如果已經是我們需要的格式，直接返回
      return jsonData;
    } catch (e) {
      console.log('非JSON格式或JSON解析失敗，使用正則表達式解析文本:', response);
      console.error('JSON解析錯誤:', e);

      // 以下是原有的正則表達式解析邏輯...
      const results: MemberRecognitionResult[] = [];
      const regex = /會員\s*ID[：:]\s*(.+?)[\n\r].*?(?:金幣捐獻|活躍貢獻)[：:]\s*([0-9.k]+)/gs;

      let match;
      while ((match = regex.exec(response)) !== null) {
        let contribution = match[2].trim();
        // 處理 k 單位
        if (contribution.toLowerCase().includes('k')) {
          contribution = String(parseFloat(contribution.toLowerCase().replace('k', '')) * 1000);
        }

        results.push({
          memberId: match[1].trim(),
          contribution: Number(contribution),
        });
      }

      // 如果沒有匹配到任何結果，嘗試其他正則表達式
      if (results.length === 0) {
        const alternativeRegex = /([^\n\r:：]+)[：:](?:[^\n\r:：]*?)(\d+\.?\d*k?|\d*\.?\d+k?)/g;
        while ((match = alternativeRegex.exec(response)) !== null) {
          let contribution = match[2].trim();
          if (contribution.toLowerCase().includes('k')) {
            contribution = String(parseFloat(contribution.toLowerCase().replace('k', '')) * 1000);
          }

          results.push({
            memberId: match[1].trim(),
            contribution: Number(contribution),
          });
        }
      }

      console.log('正則表達式解析結果:', results);
      return results;
    }
  };

  // 添加一個輔助函數來確保我們有有效的文件對象
  const ensureFileObject = (file: UploadFile): File | null => {
    // 如果已經有原始文件對象，則直接使用
    if (file.originFileObj) {
      return file.originFileObj;
    }

    // 如果有 blob 或 url 屬性，嘗試從中創建文件
    if (file.url) {
      return new File([new Blob()], file.name || 'image.jpg', {
        type: file.type || 'image/jpeg',
      });
    }

    // 無法獲取有效的文件對象
    return null;
  };

  // 修改金幣捐獻識別函數
  const recognizeCoinsContribution = async () => {
    if (fileList1.length === 0) {
      message.warning('請先上傳金幣捐獻截圖');
      return;
    }

    setLoading1(true);
    const newCoinsResults: MemberRecognitionResult[] = [];
    const newProcessingStatus = { ...processingStatus };

    try {
      // 依次處理每張圖片
      for (let i = 0; i < fileList1.length; i++) {
        const file = fileList1[i];
        const imageId = file.uid;

        // 更新處理狀態
        newProcessingStatus[imageId] = '處理中';
        setProcessingStatus(newProcessingStatus);

        // 準備 prompt
        const prompt = `請辨識圖片中週的「金幣捐獻」數據。
請注意：
1. 圖片中的數字可能以 k 表示，請將它轉換為數字，例如 1k = 1000、5.5k = 5500。
2. 請提取會員ID和對應的金幣捐獻數值。
3. 請以純JSON格式輸出結果（不要包含三個反引號json或三個反引號等標記）：
[
  {
    "會員ID": "會員名稱",
    "金幣捐獻": 數值
  }
]

請對所有圖片中的會員資料進行識別，僅返回JSON格式結果，不要添加任何其他文本或標記。`;

        try {
          // 使用輔助函數確保有有效的文件對象
          const fileObj = ensureFileObject(file);
          if (!fileObj) {
            console.error('無法獲取有效的文件對象:', file);
            newProcessingStatus[imageId] = '失敗 (無法獲取有效文件)';
            setProcessingStatus(newProcessingStatus);
            continue;
          }

          console.log('處理文件:', fileObj.name, '大小:', fileObj.size, '類型:', fileObj.type);

          // 呼叫 API 進行辨識（修改為使用Gemini API）
          const response = await callGeminiAPI(fileObj, prompt);

          // 解析回應
          const results = parseApiResponse(response);

          if (results.length === 0) {
            console.warn('解析結果為空，原始回應:', response);
            newProcessingStatus[imageId] = '失敗 (無識別結果)';
            setProcessingStatus(newProcessingStatus);
            continue;
          }

          // 為每個結果加上圖片ID
          const resultsWithImageId = results.map((result) => ({
            ...result,
            imageId,
          }));

          // 加入到總結果中
          newCoinsResults.push(...resultsWithImageId);

          // 更新處理狀態
          newProcessingStatus[imageId] = '完成';
          setProcessingStatus(newProcessingStatus);
        } catch (error) {
          console.error(`處理圖片 ${imageId} 時發生錯誤:`, error);
          newProcessingStatus[imageId] =
            `失敗 (${error instanceof Error ? error.message : '未知錯誤'})`;
          setProcessingStatus(newProcessingStatus);
        }
      }

      // 更新金幣捐獻結果
      setCoinsResults(newCoinsResults);

      if (newCoinsResults.length > 0) {
        message.success(`金幣捐獻辨識完成，共識別 ${newCoinsResults.length} 筆資料`);
        // 更新整體辨識結果
        updateRecognizedMembers(newCoinsResults, activityResults);
      } else {
        message.warning('金幣捐獻辨識完成，但未識別到任何資料');
      }
    } catch (error) {
      message.error('金幣捐獻辨識過程發生錯誤');
      console.error(error);
    } finally {
      setLoading1(false);
    }
  };

  // 修改活躍貢獻識別函數
  const recognizeActivityContribution = async () => {
    if (fileList2.length === 0) {
      message.warning('請先上傳活躍貢獻截圖');
      return;
    }

    setLoading2(true);
    const newActivityResults: MemberRecognitionResult[] = [];
    const newProcessingStatus = { ...processingStatus };

    try {
      // 依次處理每張圖片
      for (let i = 0; i < fileList2.length; i++) {
        const file = fileList2[i];
        const imageId = file.uid;

        // 更新處理狀態
        newProcessingStatus[imageId] = '處理中';
        setProcessingStatus(newProcessingStatus);

        // 準備 prompt
        const prompt = `請辨識圖片中週的「活躍貢獻」數據。
請注意：
1. 圖片中的數字可能以 k 表示，請將它轉換為數字，例如 1k = 1000、5.5k = 5500。
2. 請提取會員ID和對應的活躍貢獻數值。
3. 請以純JSON格式輸出結果（不要包含三個反引號json或三個反引號等標記）：
[
  {
    "會員ID": "會員名稱",
    "活躍貢獻": 數值
  }
]

請對所有圖片中的會員資料進行識別，僅返回JSON格式結果，不要添加任何其他文本或標記。`;

        try {
          // 使用輔助函數確保有有效的文件對象
          const fileObj = ensureFileObject(file);
          if (!fileObj) {
            console.error('無法獲取有效的文件對象:', file);
            newProcessingStatus[imageId] = '失敗 (無法獲取有效文件)';
            setProcessingStatus(newProcessingStatus);
            continue;
          }

          console.log('處理文件:', fileObj.name, '大小:', fileObj.size, '類型:', fileObj.type);

          // 呼叫 API 進行辨識（修改為使用Gemini API）
          const response = await callGeminiAPI(fileObj, prompt);

          // 解析回應
          const results = parseApiResponse(response);

          if (results.length === 0) {
            console.warn('解析結果為空，原始回應:', response);
            newProcessingStatus[imageId] = '失敗 (無識別結果)';
            setProcessingStatus(newProcessingStatus);
            continue;
          }

          // 為每個結果加上圖片ID
          const resultsWithImageId = results.map((result) => ({
            ...result,
            imageId,
          }));

          // 加入到總結果中
          newActivityResults.push(...resultsWithImageId);

          // 更新處理狀態
          newProcessingStatus[imageId] = '完成';
          setProcessingStatus(newProcessingStatus);
        } catch (error) {
          console.error(`處理圖片 ${imageId} 時發生錯誤:`, error);
          newProcessingStatus[imageId] =
            `失敗 (${error instanceof Error ? error.message : '未知錯誤'})`;
          setProcessingStatus(newProcessingStatus);
        }
      }

      // 更新活躍貢獻結果
      setActivityResults(newActivityResults);

      if (newActivityResults.length > 0) {
        message.success(`活躍貢獻辨識完成，共識別 ${newActivityResults.length} 筆資料`);
        // 更新整體辨識結果
        updateRecognizedMembers(coinsResults, newActivityResults);
      } else {
        message.warning('活躍貢獻辨識完成，但未識別到任何資料');
      }
    } catch (error) {
      message.error('活躍貢獻辨識過程發生錯誤');
      console.error(error);
    } finally {
      setLoading2(false);
    }
  };

  // 根據會員等級範圍判斷會員級別
  const determineMemberLevel = (coinsContribution: number, activityContribution: number) => {
    // 使用表格中的會員標準進行判斷
    const memberLevels = memberData.map((member) => ({
      level: member.level,
      coinsRequired: parseInt(member.coins),
      activityRequired: parseInt(member.activity),
    }));

    // 由高到低檢查，以確保會員獲得最高等級
    for (let i = memberLevels.length - 1; i >= 0; i--) {
      const level = memberLevels[i];
      if (
        coinsContribution >= level.coinsRequired &&
        activityContribution >= level.activityRequired
      ) {
        return level.level;
      }
    }
    return '未達會員標準';
  };

  // 更新識別後的會員資料
  const updateRecognizedMembers = (
    coinsData: MemberRecognitionResult[],
    activityData: MemberRecognitionResult[],
  ) => {
    // 合併金幣和活躍度數據
    const allMemberIds = [
      ...new Set([
        ...coinsData.map((item) => item.memberId),
        ...activityData.map((item) => item.memberId),
      ]),
    ];

    const results = allMemberIds.map((memberId) => {
      const coinsItem = coinsData.find((item) => item.memberId === memberId);
      const activityItem = activityData.find((item) => item.memberId === memberId);

      const coinsContribution = coinsItem ? coinsItem.contribution : 0;
      const activityContribution = activityItem ? activityItem.contribution : 0;

      return {
        memberId,
        coinsContribution,
        activityContribution,
        level: determineMemberLevel(coinsContribution, activityContribution),
      };
    });

    setRecognizedMembers(results);
  };

  // 辨識結果表格列
  const resultColumns = [
    {
      title: '會員 ID',
      dataIndex: 'memberId',
      key: 'memberId',
    },
    {
      title: '金幣捐獻',
      dataIndex: 'coinsContribution',
      key: 'coinsContribution',
    },
    {
      title: '活躍貢獻',
      dataIndex: 'activityContribution',
      key: 'activityContribution',
    },
    {
      title: '會員等級',
      dataIndex: 'level',
      key: 'level',
    },
  ];

  // 自訂上傳列表項目渲染
  const customItemRender = (originNode: React.ReactElement, file: UploadFile) => {
    const status = processingStatus[file.uid];
    return (
      <div className="ant-upload-list-item">
        {originNode}
        {status && (
          <div
            style={{
              position: 'absolute',
              right: '8px',
              top: '8px',
              background:
                status === '完成' ? '#52c41a' : status === '處理中' ? '#1890ff' : '#ff4d4f',
              color: 'white',
              padding: '0 8px',
              borderRadius: '4px',
            }}
          >
            {status}
          </div>
        )}
      </div>
    );
  };

  // 修改上傳配置，解決文件對象不存在問題
  const uploadProps1: UploadProps = {
    onRemove: (file) => {
      const index = fileList1.indexOf(file);
      const newFileList = fileList1.slice();
      newFileList.splice(index, 1);
      setFileList1(newFileList);
    },
    beforeUpload: (file) => {
      // 確保文件類型是圖片
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上傳圖片文件！');
        return Upload.LIST_IGNORE;
      }

      // 檢查文件大小
      const isLt10M = file.size / 1024 / 1024 < 10; // 限制為10MB
      if (!isLt10M) {
        message.error('圖片大小不能超過10MB！');
        return Upload.LIST_IGNORE;
      }

      // 使用新的方式添加文件，確保保留原始文件對象
      const newFile = {
        ...file,
        uid: file.uid || Math.random().toString(36).substring(2),
        originFileObj: file,
      } as UploadFile;

      setFileList1((prevList) => [...prevList, newFile]);
      return false;
    },
    fileList: fileList1,
    itemRender: customItemRender,
  };

  const uploadProps2: UploadProps = {
    onRemove: (file) => {
      const index = fileList2.indexOf(file);
      const newFileList = fileList2.slice();
      newFileList.splice(index, 1);
      setFileList2(newFileList);
    },
    beforeUpload: (file) => {
      // 確保文件類型是圖片
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上傳圖片文件！');
        return Upload.LIST_IGNORE;
      }

      // 檢查文件大小
      const isLt10M = file.size / 1024 / 1024 < 10; // 限制為10MB
      if (!isLt10M) {
        message.error('圖片大小不能超過10MB！');
        return Upload.LIST_IGNORE;
      }

      // 使用新的方式添加文件，確保保留原始文件對象
      const newFile = {
        ...file,
        uid: file.uid || Math.random().toString(36).substring(2),
        originFileObj: file,
      } as UploadFile;

      setFileList2((prevList) => [...prevList, newFile]);
      return false;
    },
    fileList: fileList2,
    itemRender: customItemRender,
  };

  // 過濾會員函數
  const filterMembersByLevel = (
    members: {
      memberId: string;
      coinsContribution: number;
      activityContribution: number;
      level: string;
    }[],
  ) => {
    if (!levelFilter) {
      return members; // 如果沒有選擇過濾條件，返回所有會員
    }
    return members.filter((member) => member.level === levelFilter);
  };

  // 獲取所有可能的會員等級（包括"未達會員標準"）
  const getAllLevels = () => {
    const standardLevels = memberData.map((member) => member.level);
    return ['未達會員標準', ...standardLevels];
  };

  // 會員等級選項
  const levelOptions = getAllLevels().map((level) => ({
    value: level,
    label: level,
  }));

  return (
    <Container>
      <Content>
        {/* 第一個區塊：表格 */}
        <Card title="會員資訊" style={{ marginBottom: 20 }}>
          <Form form={form}>
            <Table columns={columns} dataSource={memberData} pagination={false} rowKey="key" />
          </Form>
        </Card>

        {/* 第二個區塊：圖片上傳 */}
        <Card title="圖片上傳" style={{ marginBottom: 20 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Card
                title="金幣捐獻辨識"
                type="inner"
                extra={
                  <Button
                    type="primary"
                    onClick={recognizeCoinsContribution}
                    loading={loading1}
                    disabled={fileList1.length === 0}
                  >
                    開始辨識所有圖片
                  </Button>
                }
              >
                <Upload {...uploadProps1} multiple listType="picture">
                  <Button icon={<UploadOutlined />}>選擇圖片</Button>
                </Upload>
                {loading1 && (
                  <Spin tip="正在進行圖片辨識..." style={{ marginTop: 16, display: 'block' }} />
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card
                title="活躍貢獻辨識"
                type="inner"
                extra={
                  <Button
                    type="primary"
                    onClick={recognizeActivityContribution}
                    loading={loading2}
                    disabled={fileList2.length === 0}
                  >
                    開始辨識所有圖片
                  </Button>
                }
              >
                <Upload {...uploadProps2} multiple listType="picture">
                  <Button icon={<UploadOutlined />}>選擇圖片</Button>
                </Upload>
                {loading2 && (
                  <Spin tip="正在進行圖片辨識..." style={{ marginTop: 16, display: 'block' }} />
                )}
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 新增區塊：辨識結果 */}
        {recognizedMembers.length > 0 && (
          <Card
            title="辨識結果"
            extra={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>篩選會員等級：</span>
                <Select
                  style={{ width: 120 }}
                  allowClear
                  placeholder="全部等級"
                  options={levelOptions}
                  onChange={(value) => setLevelFilter(value)}
                />
              </div>
            }
          >
            <Table
              columns={resultColumns}
              dataSource={filterMembersByLevel(recognizedMembers)}
              pagination={false}
              rowKey="memberId"
            />
          </Card>
        )}
      </Content>
    </Container>
  );
};

export default Welcome;
